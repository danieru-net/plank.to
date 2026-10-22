import { StorageError, toStorageError, ValidationError, type ValidationIssue } from './errors';
import { isSymbolId } from '@/features/pictures/symbols';

import { isLocalImageUri } from './localImage';
import type { Id, LocalDate, LocalTime, TaskRow, Timestamp } from './types';

/** The subset of expo-sqlite's SQLiteDatabase that the repository needs. */
export type TaskDb = {
  runAsync(sql: string, params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: (string | number | null)[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
};

export type Task = {
  id: Id;
  title: string;
  notes: string | null;
  date: LocalDate;
  time: LocalTime | null;
  /** A symbol id from features/pictures/symbols.ts. */
  symbol: string | null;
  imageUri: string | null;
  status: TaskRow['status'];
  statusChangedAt: Timestamp | null;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
  /** The routine this task was generated from, if any. */
  routineId: Id | null;
  routineOccurrenceDate: LocalDate | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TaskInput = {
  title: string;
  date: LocalDate;
  time?: LocalTime | null;
  notes?: string | null;
  symbol?: string | null;
  imageUri?: string | null;
  reminderEnabled?: boolean;
  reminderAdvanceMinutes?: number;
};

/** Fields to change. Omitted fields are kept. */
export type TaskUpdate = Partial<TaskInput>;

export const MAX_TITLE_LENGTH = 200;
export const MAX_NOTES_LENGTH = 5000;
export const MAX_ADVANCE_MINUTES = 7 * 24 * 60;

export type RepositoryOptions = {
  now?: () => Timestamp;
  newId?: () => Id;
};

export function defaultId(): Id {
  const g = globalThis.crypto;
  if (g?.randomUUID) return g.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isRealDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isRealTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

type Normalized = {
  title: string;
  date: LocalDate;
  time: LocalTime | null;
  notes: string | null;
  symbol: string | null;
  imageUri: string | null;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
};

export const blankToNull = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

/** Validates a full task and returns it trimmed, or throws a ValidationError listing every problem. */
export function validateTask(input: TaskInput): Normalized {
  const issues: ValidationIssue[] = [];
  const title = (input.title ?? '').trim();
  if (!title) issues.push({ field: 'title', message: 'Enter a title for the task.' });
  else if (title.length > MAX_TITLE_LENGTH)
    issues.push({
      field: 'title',
      message: `Keep the title under ${MAX_TITLE_LENGTH} characters.`,
    });

  if (!isRealDate(input.date ?? ''))
    issues.push({ field: 'date', message: 'Choose a valid date for the task.' });

  const time = blankToNull(input.time);
  if (time !== null && !isRealTime(time))
    issues.push({ field: 'time', message: 'Enter the time as hours and minutes, like 19:00.' });

  const notes = blankToNull(input.notes);
  if (notes !== null && notes.length > MAX_NOTES_LENGTH)
    issues.push({
      field: 'notes',
      message: `Keep notes under ${MAX_NOTES_LENGTH} characters.`,
    });

  const symbol = blankToNull(input.symbol);
  if (symbol !== null && !isSymbolId(symbol))
    issues.push({ field: 'symbol', message: 'Choose a symbol from the list.' });

  const imageUri = blankToNull(input.imageUri);
  if (imageUri !== null && !isLocalImageUri(imageUri))
    issues.push({ field: 'imageUri', message: 'Choose a picture saved on this device.' });

  const advance = input.reminderAdvanceMinutes ?? 0;
  if (!Number.isInteger(advance) || advance < 0 || advance > MAX_ADVANCE_MINUTES)
    issues.push({
      field: 'reminderAdvanceMinutes',
      message: 'Choose a reminder lead time between 0 minutes and 7 days.',
    });

  if (issues.length) throw new ValidationError(issues);
  return {
    title,
    date: input.date,
    time,
    notes,
    symbol,
    imageUri,
    reminderEnabled: input.reminderEnabled ?? false,
    reminderAdvanceMinutes: advance,
  };
}

const notFound = () => new StorageError('not_found', 'That task could not be found.');

export function createTaskRepository(db: TaskDb, options: RepositoryOptions = {}) {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? defaultId;

  const queryFailed = (e: unknown) =>
    toStorageError('query_failed', 'Something went wrong saving your tasks. Please try again.', e);

  function toTasks(rows: TaskRow[]): Task[] {
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes,
      date: r.date,
      time: r.time,
      symbol: r.symbol,
      imageUri: r.image_uri,
      status: r.status,
      statusChangedAt: r.status_changed_at,
      reminderEnabled: r.reminder_enabled === 1,
      reminderAdvanceMinutes: r.reminder_advance_minutes,
      routineId: r.routine_id,
      routineOccurrenceDate: r.routine_occurrence_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async function getTask(id: Id): Promise<Task | null> {
    try {
      const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
      return row ? toTasks([row])[0] : null;
    } catch (e) {
      throw queryFailed(e);
    }
  }

  async function requireTask(id: Id): Promise<Task> {
    const task = await getTask(id);
    if (!task) throw notFound();
    return task;
  }

  async function createTask(
    input: TaskInput,
    routine?: { id: Id; occurrenceDate: LocalDate },
  ): Promise<Task> {
    const v = validateTask(input);
    const id = newId();
    const ts = now();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO tasks (id, title, notes, date, time, symbol, image_uri, status,
             reminder_enabled, reminder_advance_minutes, created_at, updated_at,
             routine_id, routine_occurrence_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
          [
            id,
            v.title,
            v.notes,
            v.date,
            v.time,
            v.symbol,
            v.imageUri,
            v.reminderEnabled ? 1 : 0,
            v.reminderAdvanceMinutes,
            ts,
            ts,
            routine?.id ?? null,
            routine?.occurrenceDate ?? null,
          ],
        );
      });
    } catch (e) {
      throw queryFailed(e);
    }
    return requireTask(id);
  }

  async function updateTask(id: Id, patch: TaskUpdate): Promise<Task> {
    const current = await requireTask(id);
    const v = validateTask({
      title: current.title,
      date: current.date,
      time: current.time,
      notes: current.notes,
      symbol: current.symbol,
      imageUri: current.imageUri,
      reminderEnabled: current.reminderEnabled,
      reminderAdvanceMinutes: current.reminderAdvanceMinutes,
      ...patch,
    });
    const ts = now();
    // A task that moves to another day or gets a time leaves its place in the untimed order.
    const keepPosition = v.date === current.date && v.time === null;
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE tasks SET title = ?, notes = ?, date = ?, time = ?, symbol = ?,
             image_uri = ?,
             reminder_enabled = ?, reminder_advance_minutes = ?, updated_at = ?,
             position = CASE WHEN ? THEN position END
           WHERE id = ?`,
          [
            v.title,
            v.notes,
            v.date,
            v.time,
            v.symbol,
            v.imageUri,
            v.reminderEnabled ? 1 : 0,
            v.reminderAdvanceMinutes,
            ts,
            keepPosition ? 1 : 0,
            id,
          ],
        );
      });
    } catch (e) {
      throw queryFailed(e);
    }
    return requireTask(id);
  }

  async function setStatus(id: Id, status: TaskRow['status']): Promise<Task> {
    await requireTask(id);
    const ts = now();
    try {
      await db.runAsync(
        'UPDATE tasks SET status = ?, status_changed_at = ?, updated_at = ? WHERE id = ?',
        [status, status === 'pending' ? null : ts, ts, id],
      );
    } catch (e) {
      throw queryFailed(e);
    }
    return requireTask(id);
  }

  return {
    createTask,
    getTask,
    updateTask,
    /** Whether a task was already generated for this routine occurrence (even if moved or done). */
    async hasRoutineTask(routineId: Id, occurrenceDate: LocalDate): Promise<boolean> {
      try {
        const row = await db.getFirstAsync<{ id: Id }>(
          'SELECT id FROM tasks WHERE routine_id = ? AND routine_occurrence_date = ?',
          [routineId, occurrenceDate],
        );
        return row !== null;
      } catch (e) {
        throw queryFailed(e);
      }
    },
    /**
     * Tasks for one day: timed tasks in time order, then untimed tasks in the order the person
     * chose. Untimed tasks that were never reordered come last, oldest first.
     */
    async listTasksForDate(date: LocalDate): Promise<Task[]> {
      if (!isRealDate(date))
        throw new ValidationError([{ field: 'date', message: 'Choose a valid date.' }]);
      try {
        const rows = await db.getAllAsync<TaskRow>(
          `SELECT * FROM tasks WHERE date = ?
           ORDER BY time IS NULL, time, position IS NULL, position, created_at, id`,
          [date],
        );
        return toTasks(rows);
      } catch (e) {
        throw queryFailed(e);
      }
    },
    /**
     * Saves the order of a day's untimed tasks. `ids` may be a subset (such as the tasks still to
     * do); the day's other untimed tasks keep their relative order after them.
     */
    async reorderUntimedTasks(date: LocalDate, ids: Id[]): Promise<void> {
      if (!isRealDate(date))
        throw new ValidationError([{ field: 'date', message: 'Choose a valid date.' }]);
      try {
        const rows = await db.getAllAsync<{ id: Id }>(
          `SELECT id FROM tasks WHERE date = ? AND time IS NULL
           ORDER BY position IS NULL, position, created_at, id`,
          [date],
        );
        const existing = rows.map((r) => r.id);
        if (new Set(ids).size !== ids.length || ids.some((id) => !existing.includes(id)))
          throw notFound();
        const order = [...ids, ...existing.filter((id) => !ids.includes(id))];
        await db.withTransactionAsync(async () => {
          for (const [i, id] of order.entries())
            await db.runAsync('UPDATE tasks SET position = ? WHERE id = ?', [i, id]);
        });
      } catch (e) {
        throw queryFailed(e);
      }
    },
    async deleteTask(id: Id): Promise<void> {
      await requireTask(id);
      try {
        await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
      } catch (e) {
        throw queryFailed(e);
      }
    },
    completeTask: (id: Id) => setStatus(id, 'completed'),
    dismissTask: (id: Id) => setStatus(id, 'dismissed'),
    /** Puts a completed or dismissed task back to pending. */
    reopenTask: (id: Id) => setStatus(id, 'pending'),
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
