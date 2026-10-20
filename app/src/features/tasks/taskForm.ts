import { ValidationError, type ValidationIssue } from '@/db/errors';
import type { Task, TaskInput } from '@/db/taskRepository';

export type TaskFormValues = {
  title: string;
  date: string;
  time: string;
  notes: string;
  steps: string[];
  symbol: string | null;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
};

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

/** Symbols offered in the editor. Labels are the accessible names. */
export const TASK_SYMBOLS = [
  { symbol: '🚿', label: 'Shower' },
  { symbol: '🍽️', label: 'Meal' },
  { symbol: '💊', label: 'Medicine' },
  { symbol: '🧹', label: 'Chores' },
  { symbol: '🛒', label: 'Shopping' },
  { symbol: '📞', label: 'Call' },
  { symbol: '🏃', label: 'Exercise' },
  { symbol: '📚', label: 'Study' },
  { symbol: '🛏️', label: 'Sleep' },
  { symbol: '🦷', label: 'Teeth' },
] as const;

export function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Reminders are optional, so a new task starts with them off; `advance` is the suggested notice. */
export function emptyForm(date: string, advance = 10): TaskFormValues {
  return {
    title: '',
    date,
    time: '',
    notes: '',
    steps: [],
    symbol: null,
    reminderEnabled: false,
    reminderAdvanceMinutes: advance,
  };
}

export function taskToForm(task: Task): TaskFormValues {
  return {
    title: task.title,
    date: task.date,
    time: task.time ?? '',
    notes: task.notes ?? '',
    steps: task.steps.map((s) => s.title),
    symbol: task.symbol,
    reminderEnabled: task.reminderEnabled,
    reminderAdvanceMinutes: task.reminderAdvanceMinutes,
  };
}

/** Accepts "7:00" as "07:00". Anything else is passed through for the repository to reject. */
export function normalizeTimeText(text: string): string {
  const t = text.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : t;
}

export function formToInput(values: TaskFormValues): TaskInput {
  return {
    title: values.title,
    date: values.date.trim(),
    time: normalizeTimeText(values.time) || null,
    notes: values.notes,
    steps: values.steps,
    symbol: values.symbol,
    reminderEnabled: values.reminderEnabled,
    reminderAdvanceMinutes: values.reminderAdvanceMinutes,
  };
}

const FIELDS: ReadonlySet<string> = new Set([
  'title',
  'date',
  'time',
  'notes',
  'steps',
  'symbol',
  'reminderAdvanceMinutes',
]);

/** Maps repository validation issues to per-field messages (first message per field wins). */
export function issuesToErrors(issues: ValidationIssue[]): TaskFormErrors {
  const errors: Record<string, string> = {};
  for (const { field, message } of issues) {
    const key = FIELDS.has(field) ? field : 'title';
    errors[key] ??= message;
  }
  return errors as TaskFormErrors;
}

export function errorsFrom(e: unknown): TaskFormErrors | null {
  return e instanceof ValidationError ? issuesToErrors(e.issues) : null;
}
