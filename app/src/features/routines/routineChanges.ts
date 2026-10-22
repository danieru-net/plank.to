import type { Routine, RoutineRepository } from '@/db/routineRepository';
import { formatDateHeading } from '@/features/today/agenda';
import {
  occurrencesBetween,
  occursOn,
  resolveOccurrence,
  weekdaysToMask,
  type OccurrenceException,
} from './recurrence';

/** One calm line for Today about a routine that is different from usual on that day. */
export type RoutineChange = { key: string; message: string };

function dayName(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * How the given routines differ from their usual schedule on `date`: occurrences moved to or
 * away from that day, moved to another time, skipped, or with a different title or notes.
 * Completed occurrences are left out, since there is nothing left to prepare for.
 * Messages name the routine as it is usually called, so the person recognises it.
 */
export function routineChangesForDate(
  routines: readonly Routine[],
  exceptionsByRoutine: ReadonlyMap<string, readonly OccurrenceException[]>,
  date: string,
): RoutineChange[] {
  const changes: RoutineChange[] = [];
  for (const routine of routines) {
    const schedule = {
      time: routine.time,
      weekdays: weekdaysToMask(routine.weekdays),
      startDate: routine.startDate,
      paused: routine.paused,
    };
    const exceptions = exceptionsByRoutine.get(routine.id) ?? [];
    const name = routine.title;

    // Usually on this day but moved to another one.
    const own = exceptions.find((e) => e.occurrenceDate === date);
    if (own && occursOn(schedule, date)) {
      const occurrence = resolveOccurrence(schedule, date, own);
      if (occurrence.status === 'pending' && occurrence.date !== date) {
        changes.push({
          key: `${routine.id}:${date}`,
          message: `${name} moved to ${formatDateHeading(occurrence.date)} at ${occurrence.time}.`,
        });
      }
    }

    for (const occurrence of occurrencesBetween(schedule, exceptions, date, date)) {
      const key = `${routine.id}:${occurrence.occurrenceDate}`;
      if (occurrence.status === 'completed') continue;
      if (occurrence.status === 'dismissed') {
        changes.push({ key, message: `${name} is skipped today.` });
        continue;
      }
      const parts: string[] = [];
      if (occurrence.occurrenceDate !== date) {
        parts.push(
          `${name} moved from ${dayName(occurrence.occurrenceDate)} to ${occurrence.time} today.`,
        );
      } else if (occurrence.time !== routine.time) {
        parts.push(`${name} moved to ${occurrence.time} today.`);
      }
      if (occurrence.title !== null) {
        parts.push(
          parts.length
            ? `It is called “${occurrence.title}” today.`
            : `${name} is called “${occurrence.title}” today.`,
        );
      }
      if (occurrence.notes !== null) {
        parts.push(
          parts.length ? 'Its notes are different today.' : `${name} has different notes today.`,
        );
      }
      if (parts.length) changes.push({ key, message: parts.join(' ') });
    }
  }
  return changes;
}

/** Loads the active routines and their per-day changes, and describes the ones for `date`. */
export async function loadRoutineChanges(
  repo: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  date: string,
): Promise<RoutineChange[]> {
  const routines = (await repo.listRoutines()).filter((r) => !r.paused);
  const exceptions = new Map(
    await Promise.all(
      routines.map(async (r) => [r.id, await repo.listOccurrenceOverrides(r.id)] as const),
    ),
  );
  return routineChangesForDate(routines, exceptions, date);
}
