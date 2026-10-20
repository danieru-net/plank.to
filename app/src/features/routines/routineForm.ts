import { ValidationError, type ValidationIssue } from '@/db/errors';
import type { Routine, RoutineInput } from '@/db/routineRepository';
import { normalizeTimeText } from '@/features/tasks/taskForm';
import { ALL_WEEKDAYS, maskToWeekdays, weekdaysToMask } from './recurrence';

export type RoutineFormValues = {
  title: string;
  time: string;
  /** Selected weekdays, 0 = Sunday ... 6 = Saturday. */
  weekdays: number[];
  startDate: string;
  notes: string;
  steps: string[];
  symbol: string | null;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
};

export type RoutineFormErrors = Partial<Record<keyof RoutineFormValues, string>>;

/** Display order for the day picker, Monday first. Values are 0 = Sunday ... 6 = Saturday. */
export const WEEKDAY_OPTIONS = [
  { day: 1, short: 'Mon', label: 'Monday' },
  { day: 2, short: 'Tue', label: 'Tuesday' },
  { day: 3, short: 'Wed', label: 'Wednesday' },
  { day: 4, short: 'Thu', label: 'Thursday' },
  { day: 5, short: 'Fri', label: 'Friday' },
  { day: 6, short: 'Sat', label: 'Saturday' },
  { day: 0, short: 'Sun', label: 'Sunday' },
] as const;

/** Reminders are optional, so a new routine starts with them off; `advance` is the suggested notice. */
export function emptyRoutineForm(startDate: string, advance = 10): RoutineFormValues {
  return {
    title: '',
    time: '',
    weekdays: [],
    startDate,
    notes: '',
    steps: [],
    symbol: null,
    reminderEnabled: false,
    reminderAdvanceMinutes: advance,
  };
}

export function routineToForm(routine: Routine): RoutineFormValues {
  return {
    title: routine.title,
    time: routine.time,
    weekdays: routine.weekdays,
    startDate: routine.startDate,
    notes: routine.notes ?? '',
    steps: routine.steps.map((s) => s.title),
    symbol: routine.symbol,
    reminderEnabled: routine.reminderEnabled,
    reminderAdvanceMinutes: routine.reminderAdvanceMinutes,
  };
}

export function toggleWeekday(days: readonly number[], day: number): number[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);
}

/** The "Every day" shortcut selects all seven days. */
export function allWeekdays(): number[] {
  return maskToWeekdays(ALL_WEEKDAYS);
}

export function isEveryDay(days: readonly number[]): boolean {
  return weekdaysToMask(days) === ALL_WEEKDAYS;
}

export function formToRoutineInput(values: RoutineFormValues): RoutineInput {
  return {
    title: values.title,
    time: normalizeTimeText(values.time),
    weekdays: values.weekdays,
    startDate: values.startDate.trim(),
    notes: values.notes,
    steps: values.steps,
    symbol: values.symbol,
    reminderEnabled: values.reminderEnabled,
    reminderAdvanceMinutes: values.reminderAdvanceMinutes,
  };
}

const FIELDS: ReadonlySet<string> = new Set([
  'title',
  'time',
  'weekdays',
  'startDate',
  'notes',
  'steps',
  'symbol',
  'reminderAdvanceMinutes',
]);

/** Maps repository validation issues to per-field messages (first message per field wins). */
export function routineIssuesToErrors(issues: ValidationIssue[]): RoutineFormErrors {
  const errors: Record<string, string> = {};
  for (const { field, message } of issues) {
    const key = FIELDS.has(field) ? field : 'title';
    errors[key] ??= message;
  }
  return errors as RoutineFormErrors;
}

export function routineErrorsFrom(e: unknown): RoutineFormErrors | null {
  return e instanceof ValidationError ? routineIssuesToErrors(e.issues) : null;
}
