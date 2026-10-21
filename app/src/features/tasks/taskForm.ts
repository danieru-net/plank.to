import { ValidationError, type ValidationIssue } from '@/db/errors';
import type { Task, TaskInput } from '@/db/taskRepository';

export type TaskFormValues = {
  title: string;
  date: string;
  time: string;
  notes: string;
  reminderEnabled: boolean;
  reminderAdvanceMinutes: number;
};

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

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
    reminderEnabled: values.reminderEnabled,
    reminderAdvanceMinutes: values.reminderAdvanceMinutes,
  };
}

const FIELDS: ReadonlySet<string> = new Set([
  'title',
  'date',
  'time',
  'notes',
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
