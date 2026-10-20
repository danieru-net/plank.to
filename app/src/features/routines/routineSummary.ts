import { WEEKDAY_OPTIONS, isEveryDay } from './routineForm';

/** A short, plain-language summary of the weekdays, such as "Every day" or "Mon, Wed, Fri". */
export function weekdaysSummary(days: readonly number[]): string {
  if (days.length === 0) return 'No days';
  if (isEveryDay(days)) return 'Every day';
  return WEEKDAY_OPTIONS.filter((o) => days.includes(o.day))
    .map((o) => o.short)
    .join(', ');
}

/** The same summary with full day names, for screen readers. */
export function weekdaysSpoken(days: readonly number[]): string {
  if (days.length === 0) return 'no days';
  if (isEveryDay(days)) return 'every day';
  return WEEKDAY_OPTIONS.filter((o) => days.includes(o.day))
    .map((o) => o.label)
    .join(', ');
}

/** One line for the routine list, e.g. "19:00 · Mon, Wed, Fri" (with "Paused" when paused). */
export function routineSummary(r: {
  time: string;
  weekdays: readonly number[];
  paused: boolean;
}): string {
  return `${r.time} · ${weekdaysSummary(r.weekdays)}${r.paused ? ' · Paused' : ''}`;
}
