/**
 * Recurrence semantics for weekly routines. Pure functions, no database or clock access.
 * The written rules (skips, timezones, DST, overrides) are in docs/recurrence.md.
 *
 * A routine is a local wall-clock `HH:MM` plus a weekday bitmask (bit 0 = Sunday ... bit 6 =
 * Saturday, 127 = every day) and a `startDate`. Occurrences are derived, never stored; only
 * exceptions are stored (occurrence_overrides). Dates are local `YYYY-MM-DD` strings.
 */
import { addDays } from '@/features/today/agenda';

export const ALL_WEEKDAYS = 127;

export type RoutineSchedule = {
  /** Local wall-clock time, `HH:MM`. */
  time: string;
  weekdays: number;
  startDate: string;
  paused: boolean;
};

export type OverrideStatus = 'pending' | 'completed' | 'dismissed';

/** The parts of an `occurrence_overrides` row that affect scheduling. */
export type OccurrenceException = {
  occurrenceDate: string;
  status: OverrideStatus;
  title: string | null;
  notes: string | null;
  movedDate: string | null;
  movedTime: string | null;
  reminderEnabled: boolean | null;
};

export type Occurrence = {
  /** The date the routine generated this occurrence for; with the routine ID it is the identity. */
  occurrenceDate: string;
  /** Where the occurrence appears now (differs from occurrenceDate when moved). */
  date: string;
  time: string;
  status: OverrideStatus;
  /** Override fields; null means "use the routine's value". */
  title: string | null;
  notes: string | null;
  reminderEnabled: boolean | null;
  moved: boolean;
};

/** 0 = Sunday ... 6 = Saturday, from calendar arithmetic (independent of device timezone). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function weekdaysToMask(days: readonly number[]): number {
  let mask = 0;
  for (const day of days) {
    if (!Number.isInteger(day) || day < 0 || day > 6)
      throw new RangeError(`Invalid weekday: ${day}`);
    mask |= 1 << day;
  }
  return mask;
}

export function maskToWeekdays(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((day) => (mask & (1 << day)) !== 0);
}

/** A mask is valid when it is an integer selecting 1 to 7 days (matches the DB CHECK). */
export function isValidWeekdayMask(mask: number): boolean {
  return Number.isInteger(mask) && mask >= 1 && mask <= ALL_WEEKDAYS;
}

/**
 * Whether the routine generates an occurrence on `date`. Paused routines generate none, and
 * nothing is generated before `startDate` (so past days are never backfilled).
 */
export function occursOn(routine: RoutineSchedule, date: string): boolean {
  if (routine.paused || !isValidWeekdayMask(routine.weekdays)) return false;
  if (date < routine.startDate) return false;
  return (routine.weekdays & (1 << weekdayOf(date))) !== 0;
}

/** Applies an occurrence's exception (if any) over the routine for one generated date. */
export function resolveOccurrence(
  routine: RoutineSchedule,
  date: string,
  exception: OccurrenceException | undefined,
): Occurrence {
  return {
    occurrenceDate: date,
    date: exception?.movedDate ?? date,
    time: exception?.movedTime ?? routine.time,
    status: exception?.status ?? 'pending',
    title: exception?.title ?? null,
    notes: exception?.notes ?? null,
    reminderEnabled: exception?.reminderEnabled ?? null,
    moved: exception?.movedDate != null || exception?.movedTime != null,
  };
}

/**
 * Occurrences that appear on dates in [from, to] inclusive, in chronological order.
 * Moved occurrences appear on their new date; the original date no longer shows them.
 * Dismissed and completed occurrences are included (callers filter), so they can be undone.
 * An exception only applies while the routine still generates that date; if the weekdays
 * change so the date no longer matches, the exception is ignored (not deleted).
 * Paused routines return nothing, including previously moved occurrences.
 */
export function occurrencesBetween(
  routine: RoutineSchedule,
  exceptions: readonly OccurrenceException[],
  from: string,
  to: string,
): Occurrence[] {
  if (routine.paused || from > to) return [];
  const byDate = new Map(exceptions.map((e) => [e.occurrenceDate, e]));
  const results: Occurrence[] = [];
  // Look back/forward a bounded margin so occurrences moved into the window are found.
  const scanFrom = addDays(from, -MAX_MOVE_DAYS);
  const scanTo = addDays(to, MAX_MOVE_DAYS);
  for (let date = scanFrom; date <= scanTo; date = addDays(date, 1)) {
    if (!occursOn(routine, date)) continue;
    const occurrence = resolveOccurrence(routine, date, byDate.get(date));
    if (occurrence.date >= from && occurrence.date <= to) results.push(occurrence);
  }
  return results.sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.time < b.time ? -1 : a.time > b.time ? 1 : 0,
  );
}

/** Largest distance an occurrence may be moved from its generated date. */
export const MAX_MOVE_DAYS = 366;

/**
 * Converts a local date and time to an absolute Date using the device's current timezone.
 * Use this only when scheduling a notification, never to store a routine.
 *
 * Skipped time (spring forward, e.g. 02:30 does not exist): the Date constructor moves it
 * forward by the gap, so the reminder fires at the first valid instant after the gap.
 * Repeated time (fall back, 01:30 happens twice): the first (earlier) occurrence is used.
 */
export function toLocalDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
