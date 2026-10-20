import {
  isValidWeekdayMask,
  MAX_MOVE_DAYS,
  maskToWeekdays,
  occursOn,
  weekdaysToMask,
  type OccurrenceException,
} from '@/features/routines/recurrence';
import { addDays } from '@/features/today/agenda';

import { StorageError, toStorageError, ValidationError, type ValidationIssue } from './errors';
import { isLocalImageUri } from './localImage';
import {
  blankToNull,
  isRealDate,
  isRealTime,
  defaultId,
  MAX_ADVANCE_MINUTES,
  MAX_NOTES_LENGTH,
  MAX_STEPS,
  MAX_TITLE_LENGTH,
  type RepositoryOptions,
  type TaskDb,
} from './taskRepository';
import type {
  Id,
  LocalDate,
  LocalTime,
  OccurrenceOverrideRow,
  RoutineRow,
  StepRow,
  Timestamp,
} from './types';

export type Routine = {
  id: Id;
  title: string;
  notes: string | null;
  time: LocalTime;
  /** Selected weekdays, 0 = Sunday ... 6 = Saturday, ascending. */
  weekdays: number[];
  /** The routine never generates occurrences before this date. */
  startDate: LocalDate;
  symbol: string | null;
  imageUri: string | null;
  paused: boolean;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
  steps: { id: Id; title: string }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type RoutineInput = {
  title: string;
  time: LocalTime;
  /** Weekdays, 0 = Sunday ... 6 = Saturday. At least one is required. */
  weekdays: readonly number[];
  startDate: LocalDate;
  notes?: string | null;
  symbol?: string | null;
  imageUri?: string | null;
  reminderEnabled?: boolean;
  reminderAdvanceMinutes?: number;
  /** Step titles in order. Blank titles are ignored. */
  steps?: string[];
};

/** Fields to change. Omitted fields are kept; `steps`, when given, replaces all steps. */
export type RoutineUpdate = Partial<RoutineInput>;

type Normalized = {
  title: string;
  time: LocalTime;
  weekdays: number;
  startDate: LocalDate;
  notes: string | null;
  symbol: string | null;
  imageUri: string | null;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
  steps: string[];
};

/** Validates a full routine and returns it trimmed, or throws a ValidationError listing every problem. */
export function validateRoutine(input: RoutineInput): Normalized {
  const issues: ValidationIssue[] = [];
  const title = (input.title ?? '').trim();
  if (!title) issues.push({ field: 'title', message: 'Enter a title for the routine.' });
  else if (title.length > MAX_TITLE_LENGTH)
    issues.push({
      field: 'title',
      message: `Keep the title under ${MAX_TITLE_LENGTH} characters.`,
    });

  const time = blankToNull(input.time);
  if (time === null || !isRealTime(time))
    issues.push({ field: 'time', message: 'Enter the time as hours and minutes, like 19:00.' });

  let weekdays = 0;
  const days = input.weekdays ?? [];
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    issues.push({ field: 'weekdays', message: 'Choose weekdays from Sunday to Saturday.' });
  else {
    weekdays = weekdaysToMask(days);
    if (!isValidWeekdayMask(weekdays))
      issues.push({ field: 'weekdays', message: 'Choose at least one day of the week.' });
  }

  if (!isRealDate(input.startDate ?? ''))
    issues.push({ field: 'startDate', message: 'Choose a valid start date.' });

  const notes = blankToNull(input.notes);
  if (notes !== null && notes.length > MAX_NOTES_LENGTH)
    issues.push({ field: 'notes', message: `Keep notes under ${MAX_NOTES_LENGTH} characters.` });

  const imageUri = blankToNull(input.imageUri);
  if (imageUri !== null && !isLocalImageUri(imageUri))
    issues.push({ field: 'imageUri', message: 'Choose a picture saved on this device.' });

  const advance = input.reminderAdvanceMinutes ?? 0;
  if (!Number.isInteger(advance) || advance < 0 || advance > MAX_ADVANCE_MINUTES)
    issues.push({
      field: 'reminderAdvanceMinutes',
      message: 'Choose a reminder lead time between 0 minutes and 7 days.',
    });

  const steps = (input.steps ?? []).map((s) => s.trim()).filter(Boolean);
  if (steps.length > MAX_STEPS)
    issues.push({ field: 'steps', message: `Use ${MAX_STEPS} steps or fewer.` });
  else if (steps.some((s) => s.length > MAX_TITLE_LENGTH))
    issues.push({
      field: 'steps',
      message: `Keep each step under ${MAX_TITLE_LENGTH} characters.`,
    });

  if (issues.length) throw new ValidationError(issues);
  return {
    title,
    time: time as LocalTime,
    weekdays,
    startDate: input.startDate,
    notes,
    symbol: blankToNull(input.symbol),
    imageUri,
    reminderEnabled: input.reminderEnabled ?? false,
    reminderAdvanceMinutes: advance,
    steps,
  };
}

/** A stored exception for one generated occurrence. Null fields mean "use the routine's value". */
export type OccurrenceOverride = OccurrenceException & { id: Id; routineId: Id };

/**
 * Changes to one occurrence. Omitted fields are kept; `null` clears that field back to the
 * routine's value. This never modifies the routine itself.
 */
export type OccurrencePatch = {
  status?: OccurrenceException['status'];
  title?: string | null;
  notes?: string | null;
  movedDate?: LocalDate | null;
  movedTime?: LocalTime | null;
  reminderEnabled?: boolean | null;
};

function toOverride(r: OccurrenceOverrideRow): OccurrenceOverride {
  return {
    id: r.id,
    routineId: r.routine_id,
    occurrenceDate: r.occurrence_date,
    status: r.status,
    title: r.title,
    notes: r.notes,
    movedDate: r.moved_date,
    movedTime: r.moved_time,
    reminderEnabled: r.reminder_enabled === null ? null : r.reminder_enabled === 1,
  };
}

const notFound = () => new StorageError('not_found', 'That routine could not be found.');

export function createRoutineRepository(db: TaskDb, options: RepositoryOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? defaultId;

  const queryFailed = (e: unknown) =>
    toStorageError(
      'query_failed',
      'Something went wrong saving your routines. Please try again.',
      e,
    );

  async function attachSteps(rows: RoutineRow[]): Promise<Routine[]> {
    if (!rows.length) return [];
    const marks = rows.map(() => '?').join(', ');
    const steps = await db.getAllAsync<StepRow>(
      `SELECT * FROM steps WHERE routine_id IN (${marks}) ORDER BY position`,
      rows.map((r) => r.id),
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes,
      time: r.time,
      weekdays: maskToWeekdays(r.weekdays),
      startDate: r.start_date,
      symbol: r.symbol,
      imageUri: r.image_uri,
      paused: r.paused === 1,
      reminderEnabled: r.reminder_enabled === 1,
      reminderAdvanceMinutes: r.reminder_advance_minutes,
      steps: steps.filter((s) => s.routine_id === r.id).map((s) => ({ id: s.id, title: s.title })),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async function insertSteps(routineId: Id, titles: string[], ts: Timestamp) {
    for (const [position, title] of titles.entries()) {
      await db.runAsync(
        `INSERT INTO steps (id, routine_id, position, title, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId(), routineId, position, title, ts, ts],
      );
    }
  }

  async function getRoutine(id: Id): Promise<Routine | null> {
    try {
      const row = await db.getFirstAsync<RoutineRow>('SELECT * FROM routines WHERE id = ?', [id]);
      return row ? (await attachSteps([row]))[0] : null;
    } catch (e) {
      throw queryFailed(e);
    }
  }

  async function requireRoutine(id: Id): Promise<Routine> {
    const routine = await getRoutine(id);
    if (!routine) throw notFound();
    return routine;
  }

  async function createRoutine(input: RoutineInput): Promise<Routine> {
    const v = validateRoutine(input);
    const id = newId();
    const ts = now();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO routines (id, title, notes, time, weekdays, start_date, symbol, image_uri,
             paused, reminder_enabled, reminder_advance_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            id,
            v.title,
            v.notes,
            v.time,
            v.weekdays,
            v.startDate,
            v.symbol,
            v.imageUri,
            v.reminderEnabled ? 1 : 0,
            v.reminderAdvanceMinutes,
            ts,
            ts,
          ],
        );
        await insertSteps(id, v.steps, ts);
      });
    } catch (e) {
      throw queryFailed(e);
    }
    return requireRoutine(id);
  }

  async function updateRoutine(id: Id, patch: RoutineUpdate): Promise<Routine> {
    const current = await requireRoutine(id);
    const v = validateRoutine({
      title: current.title,
      time: current.time,
      weekdays: current.weekdays,
      startDate: current.startDate,
      notes: current.notes,
      symbol: current.symbol,
      imageUri: current.imageUri,
      reminderEnabled: current.reminderEnabled,
      reminderAdvanceMinutes: current.reminderAdvanceMinutes,
      steps: current.steps.map((s) => s.title),
      ...patch,
    });
    const ts = now();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE routines SET title = ?, notes = ?, time = ?, weekdays = ?, start_date = ?,
             symbol = ?, image_uri = ?, reminder_enabled = ?, reminder_advance_minutes = ?,
             updated_at = ?
           WHERE id = ?`,
          [
            v.title,
            v.notes,
            v.time,
            v.weekdays,
            v.startDate,
            v.symbol,
            v.imageUri,
            v.reminderEnabled ? 1 : 0,
            v.reminderAdvanceMinutes,
            ts,
            id,
          ],
        );
        if (patch.steps !== undefined) {
          await db.runAsync('DELETE FROM steps WHERE routine_id = ?', [id]);
          await insertSteps(id, v.steps, ts);
        }
      });
    } catch (e) {
      throw queryFailed(e);
    }
    return requireRoutine(id);
  }

  async function setPaused(id: Id, paused: boolean): Promise<Routine> {
    await requireRoutine(id);
    try {
      await db.runAsync('UPDATE routines SET paused = ?, updated_at = ? WHERE id = ?', [
        paused ? 1 : 0,
        now(),
        id,
      ]);
    } catch (e) {
      throw queryFailed(e);
    }
    return requireRoutine(id);
  }

  async function listOccurrenceOverrides(routineId: Id): Promise<OccurrenceOverride[]> {
    try {
      const rows = await db.getAllAsync<OccurrenceOverrideRow>(
        'SELECT * FROM occurrence_overrides WHERE routine_id = ? ORDER BY occurrence_date',
        [routineId],
      );
      return rows.map(toOverride);
    } catch (e) {
      throw queryFailed(e);
    }
  }

  /**
   * Saves a change that applies to one generated occurrence only. The occurrence is identified
   * by the date the routine generates it (`occurrenceDate`), even if it has been moved. The
   * routine is never touched. An override that ends up identical to the routine is removed.
   */
  async function saveOccurrence(
    routineId: Id,
    occurrenceDate: LocalDate,
    patch: OccurrencePatch,
  ): Promise<OccurrenceOverride | null> {
    const routine = await requireRoutine(routineId);
    const issues: ValidationIssue[] = [];
    // Paused routines still accept edits; only the weekday and start date decide the identity.
    if (
      !isRealDate(occurrenceDate) ||
      !occursOn(
        {
          time: routine.time,
          weekdays: weekdaysToMask(routine.weekdays),
          startDate: routine.startDate,
          paused: false,
        },
        occurrenceDate,
      )
    )
      throw new ValidationError([
        { field: 'occurrenceDate', message: 'This routine does not repeat on that day.' },
      ]);

    let existing: OccurrenceOverrideRow | null;
    try {
      existing = await db.getFirstAsync<OccurrenceOverrideRow>(
        'SELECT * FROM occurrence_overrides WHERE routine_id = ? AND occurrence_date = ?',
        [routineId, occurrenceDate],
      );
    } catch (e) {
      throw queryFailed(e);
    }

    const has = (k: keyof OccurrencePatch) => Object.hasOwn(patch, k);
    // Title, date, and time are replaced or cleared (null); an empty string is invalid.
    const title = has('title') ? (patch.title?.trim() ?? null) : (existing?.title ?? null);
    const notes = has('notes') ? blankToNull(patch.notes) : (existing?.notes ?? null);
    const movedDate = has('movedDate')
      ? (patch.movedDate?.trim() ?? null)
      : (existing?.moved_date ?? null);
    const movedTime = has('movedTime')
      ? (patch.movedTime?.trim() ?? null)
      : (existing?.moved_time ?? null);
    const reminder = has('reminderEnabled')
      ? (patch.reminderEnabled ?? null)
      : existing?.reminder_enabled == null
        ? null
        : existing.reminder_enabled === 1;
    const status = patch.status ?? existing?.status ?? 'pending';

    if (title === '') issues.push({ field: 'title', message: 'Enter a title for this day.' });
    else if (title !== null && title.length > MAX_TITLE_LENGTH)
      issues.push({
        field: 'title',
        message: `Keep the title under ${MAX_TITLE_LENGTH} characters.`,
      });
    if (notes !== null && notes.length > MAX_NOTES_LENGTH)
      issues.push({ field: 'notes', message: `Keep notes under ${MAX_NOTES_LENGTH} characters.` });
    if (movedDate !== null) {
      if (!isRealDate(movedDate))
        issues.push({ field: 'movedDate', message: 'Choose a valid date.' });
      else if (
        movedDate < addDays(occurrenceDate, -MAX_MOVE_DAYS) ||
        movedDate > addDays(occurrenceDate, MAX_MOVE_DAYS)
      )
        issues.push({
          field: 'movedDate',
          message: 'Choose a date within a year of the original day.',
        });
    }
    if (movedTime !== null && !isRealTime(movedTime))
      issues.push({
        field: 'movedTime',
        message: 'Enter the time as hours and minutes, like 19:00.',
      });
    if (!['pending', 'completed', 'dismissed'].includes(status))
      issues.push({ field: 'status', message: 'Choose a valid status.' });
    if (issues.length) throw new ValidationError(issues);

    const unchanged =
      status === 'pending' &&
      title === null &&
      notes === null &&
      movedDate === null &&
      movedTime === null &&
      reminder === null;
    const ts = now();
    try {
      if (unchanged) {
        if (existing)
          await db.runAsync('DELETE FROM occurrence_overrides WHERE id = ?', [existing.id]);
        return null;
      }
      const statusChangedAt =
        status !== (existing?.status ?? 'pending') ? ts : (existing?.status_changed_at ?? null);
      const values = [
        status,
        statusChangedAt,
        title,
        notes,
        movedDate,
        movedTime,
        reminder === null ? null : reminder ? 1 : 0,
        ts,
      ];
      let id: Id;
      if (existing) {
        id = existing.id;
        await db.runAsync(
          `UPDATE occurrence_overrides SET status = ?, status_changed_at = ?, title = ?, notes = ?,
             moved_date = ?, moved_time = ?, reminder_enabled = ?, updated_at = ?
           WHERE id = ?`,
          [...values, id],
        );
      } else {
        id = newId();
        await db.runAsync(
          `INSERT INTO occurrence_overrides (id, routine_id, occurrence_date, status,
             status_changed_at, title, notes, moved_date, moved_time, reminder_enabled,
             updated_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, routineId, occurrenceDate, ...values, ts],
        );
      }
      const row = await db.getFirstAsync<OccurrenceOverrideRow>(
        'SELECT * FROM occurrence_overrides WHERE id = ?',
        [id],
      );
      return row ? toOverride(row) : null;
    } catch (e) {
      throw queryFailed(e);
    }
  }

  return {
    createRoutine,
    getRoutine,
    listOccurrenceOverrides,
    saveOccurrence,
    /** Removes every change to one occurrence so it follows the routine again. */
    clearOccurrence: async (routineId: Id, occurrenceDate: LocalDate): Promise<void> => {
      try {
        await db.runAsync(
          'DELETE FROM occurrence_overrides WHERE routine_id = ? AND occurrence_date = ?',
          [routineId, occurrenceDate],
        );
      } catch (e) {
        throw queryFailed(e);
      }
    },
    updateRoutine,
    /** All routines, active ones first, then by time and creation order. */
    async listRoutines(): Promise<Routine[]> {
      try {
        const rows = await db.getAllAsync<RoutineRow>(
          'SELECT * FROM routines ORDER BY paused, time, created_at, id',
          [],
        );
        return await attachSteps(rows);
      } catch (e) {
        throw queryFailed(e);
      }
    },
    pauseRoutine: (id: Id) => setPaused(id, true),
    resumeRoutine: (id: Id) => setPaused(id, false),
    /** Deletes the routine; its steps and per-occurrence overrides are removed with it. */
    async deleteRoutine(id: Id): Promise<void> {
      await requireRoutine(id);
      try {
        await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
      } catch (e) {
        throw queryFailed(e);
      }
    },
  };
}

export type RoutineRepository = ReturnType<typeof createRoutineRepository>;
