import type { RoutineRepository } from '@/db/routineRepository';
import type { TaskRepository } from '@/db/taskRepository';
import { routineOccurrencesForDate } from './routineAgenda';

/**
 * Turns the routines scheduled for `date` into ordinary tasks, once per occurrence.
 * A routine is just a task that repeats, so after this the day's list is only tasks.
 * Skipped (dismissed) occurrences get no task. Returns how many tasks were created.
 */
export async function createRoutineTasksForDate(
  tasks: Pick<TaskRepository, 'createTask' | 'hasRoutineTask' | 'completeTask'>,
  routines: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  date: string,
): Promise<number> {
  const active = (await routines.listRoutines()).filter((r) => !r.paused);
  const overrides = new Map(
    await Promise.all(
      active.map(async (r) => [r.id, await routines.listOccurrenceOverrides(r.id)] as const),
    ),
  );
  const byId = new Map(active.map((r) => [r.id, r]));
  let created = 0;
  for (const item of routineOccurrencesForDate(active, overrides, date)) {
    const routine = byId.get(item.routineId)!;
    const { occurrence, details } = item;
    if (occurrence.status === 'dismissed') continue;
    if (await tasks.hasRoutineTask(routine.id, occurrence.occurrenceDate)) continue;
    const task = await tasks.createTask(
      {
        title: details.title,
        notes: details.notes,
        date: details.date,
        time: details.time,
        imageUri: routine.imageUri,
        reminderEnabled: occurrence.reminderEnabled ?? routine.reminderEnabled,
        reminderAdvanceMinutes: routine.reminderAdvanceMinutes,
      },
      { id: routine.id, occurrenceDate: occurrence.occurrenceDate },
    );
    if (occurrence.status === 'completed') await tasks.completeTask(task.id);
    created += 1;
  }
  return created;
}
