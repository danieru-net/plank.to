import type { Routine, RoutineRepository } from '@/db/routineRepository';
import { occurrenceDetails, type OccurrenceDetails } from './occurrenceForm';
import { occurrencesBetween, weekdaysToMask, type Occurrence } from './recurrence';

export type RoutineOccurrence = {
  routineId: string;
  symbol: string | null;
  occurrence: Occurrence;
  details: OccurrenceDetails;
};

/** Occurrences of the given routines that appear on `date`, earliest time first. */
export function routineOccurrencesForDate(
  routines: readonly Routine[],
  overridesByRoutine: ReadonlyMap<string, Parameters<typeof occurrencesBetween>[1]>,
  date: string,
): RoutineOccurrence[] {
  const items: RoutineOccurrence[] = [];
  for (const routine of routines) {
    const schedule = {
      time: routine.time,
      weekdays: weekdaysToMask(routine.weekdays),
      startDate: routine.startDate,
      paused: routine.paused,
    };
    for (const occurrence of occurrencesBetween(
      schedule,
      overridesByRoutine.get(routine.id) ?? [],
      date,
      date,
    )) {
      items.push({
        routineId: routine.id,
        symbol: routine.symbol,
        occurrence,
        details: occurrenceDetails(routine, occurrence),
      });
    }
  }
  return items.sort((a, b) =>
    a.details.time < b.details.time ? -1 : a.details.time > b.details.time ? 1 : 0,
  );
}

export async function loadRoutineOccurrences(
  repo: RoutineRepository,
  date: string,
): Promise<RoutineOccurrence[]> {
  const routines = (await repo.listRoutines()).filter((r) => !r.paused);
  const overrides = new Map(
    await Promise.all(
      routines.map(async (r) => [r.id, await repo.listOccurrenceOverrides(r.id)] as const),
    ),
  );
  return routineOccurrencesForDate(routines, overrides, date);
}
