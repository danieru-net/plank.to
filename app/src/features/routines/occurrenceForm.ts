import { ValidationError, type ValidationIssue } from '@/db/errors';
import type { OccurrencePatch, Routine } from '@/db/routineRepository';
import { normalizeTimeText } from '@/features/tasks/taskForm';
import type { Occurrence } from './recurrence';

/** What an occurrence shows once its exceptions are applied over the routine. */
export type OccurrenceDetails = {
  title: string;
  notes: string | null;
  date: string;
  time: string;
};

export function occurrenceDetails(routine: Routine, occurrence: Occurrence): OccurrenceDetails {
  return {
    title: occurrence.title ?? routine.title,
    notes: occurrence.notes ?? routine.notes,
    date: occurrence.date,
    time: occurrence.time,
  };
}

export type OccurrenceFormValues = { title: string; notes: string; date: string; time: string };
export type OccurrenceFormErrors = Partial<Record<keyof OccurrenceFormValues, string>>;

export function occurrenceToForm(details: OccurrenceDetails): OccurrenceFormValues {
  return {
    title: details.title,
    notes: details.notes ?? '',
    date: details.date,
    time: details.time,
  };
}

/**
 * Builds the "this day only" change. A value equal to the routine's own is stored as null so
 * the occurrence keeps following later edits to the routine for that field.
 */
export function formToOccurrencePatch(
  routine: Routine,
  occurrenceDate: string,
  values: OccurrenceFormValues,
): OccurrencePatch {
  const title = values.title.trim();
  const notes = values.notes.trim();
  const date = values.date.trim();
  const time = normalizeTimeText(values.time);
  return {
    title: title === routine.title ? null : title,
    notes: notes === (routine.notes ?? '') ? null : notes,
    movedDate: date === occurrenceDate ? null : date,
    movedTime: time === routine.time ? null : time,
  };
}

const FIELD_FOR_ISSUE: Record<string, keyof OccurrenceFormValues> = {
  title: 'title',
  notes: 'notes',
  movedDate: 'date',
  movedTime: 'time',
};

export function occurrenceErrorsFrom(e: unknown): OccurrenceFormErrors | null {
  if (!(e instanceof ValidationError)) return null;
  const errors: OccurrenceFormErrors = {};
  e.issues.forEach(({ field, message }: ValidationIssue) => {
    errors[FIELD_FOR_ISSUE[field] ?? 'title'] ??= message;
  });
  return errors;
}

/** Short description of how an occurrence differs from its routine, for lists and screen readers. */
export function occurrenceStatusText(occurrence: Occurrence): string | null {
  if (occurrence.status === 'completed') return 'Done';
  if (occurrence.status === 'dismissed') return 'Skipped';
  if (occurrence.moved) return 'Changed for this day';
  if (occurrence.title !== null || occurrence.notes !== null) return 'Changed for this day';
  return null;
}
