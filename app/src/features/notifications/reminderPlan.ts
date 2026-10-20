/**
 * Plans which local reminders should exist. Pure apart from the repository reads in
 * `loadReminderPlan`; the OS calls live in reminderService.ts.
 *
 * Identifiers are stable so scheduling the same item again replaces it instead of duplicating:
 * `task:<taskId>` and `routine:<routineId>:<occurrenceDate>` (the occurrence's identity, see
 * docs/recurrence.md). Moving an occurrence changes its fire time, not its identifier.
 */
import type { Routine, RoutineRepository } from '@/db/routineRepository';
import type { Task, TaskRepository } from '@/db/taskRepository';
import {
  routineOccurrencesForDate,
  type RoutineOccurrence,
} from '@/features/routines/routineAgenda';
import { toLocalDate } from '@/features/routines/recurrence';
import { addDays } from '@/features/today/agenda';
import { applyQuietHours, type QuietHours } from './reminderSettings';

/** How many days ahead reminders are scheduled, counting today. */
export const REMINDER_WINDOW_DAYS = 7;
/** iOS keeps at most 64 pending local notifications; stay under it. */
export const MAX_SCHEDULED_REMINDERS = 60;

export type PlannedReminder = {
  id: string;
  fireAt: Date;
  title: string;
  body: string | null;
  data: { kind: 'task' | 'routine'; taskId?: string; routineId?: string; date: string };
};

export const taskReminderId = (taskId: string) => `task:${taskId}`;
export const routineReminderId = (routineId: string, occurrenceDate: string) =>
  `routine:${routineId}:${occurrenceDate}`;

export function localDateString(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * When the reminder should fire: the item's time minus the advance notice, delayed to the end
 * of quiet hours if it lands inside them. Null when that would be after the item's own time
 * (a reminder that late is skipped rather than shown after the fact).
 */
function fireTime(
  date: string,
  time: string,
  advanceMinutes: number,
  quietHours?: QuietHours,
): Date | null {
  const at = toLocalDate(date, time);
  const early = new Date(at.getTime() - advanceMinutes * 60_000);
  const fireAt = quietHours ? applyQuietHours(early, quietHours) : early;
  return fireAt.getTime() > at.getTime() ? null : fireAt;
}

/** Pending, timed tasks with reminders on, whose reminder time is still in the future. */
export function planTaskReminders(
  tasks: readonly Task[],
  now: Date,
  quietHours?: QuietHours,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const task of tasks) {
    if (!task.reminderEnabled || task.status !== 'pending' || !task.time) continue;
    const fireAt = fireTime(task.date, task.time, task.reminderAdvanceMinutes, quietHours);
    if (!fireAt || fireAt.getTime() <= now.getTime()) continue;
    planned.push({
      id: taskReminderId(task.id),
      fireAt,
      title: task.title,
      body: task.notes,
      data: { kind: 'task', taskId: task.id, date: task.date },
    });
  }
  return planned;
}

/**
 * Pending routine occurrences with reminders on. A per-day override of `reminderEnabled`
 * wins over the routine's setting; dismissed and completed occurrences get none.
 */
export function planRoutineReminders(
  items: readonly RoutineOccurrence[],
  routines: ReadonlyMap<string, Routine>,
  now: Date,
  quietHours?: QuietHours,
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const item of items) {
    const routine = routines.get(item.routineId);
    if (!routine || item.occurrence.status !== 'pending') continue;
    const enabled = item.occurrence.reminderEnabled ?? routine.reminderEnabled;
    if (!enabled) continue;
    const { details, occurrence } = item;
    const fireAt = fireTime(details.date, details.time, routine.reminderAdvanceMinutes, quietHours);
    if (!fireAt || fireAt.getTime() <= now.getTime()) continue;
    planned.push({
      id: routineReminderId(item.routineId, occurrence.occurrenceDate),
      fireAt,
      title: details.title,
      body: details.notes,
      data: {
        kind: 'routine',
        routineId: item.routineId,
        date: occurrence.occurrenceDate,
      },
    });
  }
  return planned;
}

/** Earliest first, de-duplicated by identifier, capped to what the OS allows. */
export function boundReminders(
  planned: readonly PlannedReminder[],
  max: number = MAX_SCHEDULED_REMINDERS,
): PlannedReminder[] {
  const byId = new Map<string, PlannedReminder>();
  for (const reminder of planned) byId.set(reminder.id, reminder);
  return [...byId.values()]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || (a.id < b.id ? -1 : 1))
    .slice(0, max);
}

/** Reads tasks and routines for the window and returns the reminders that should exist. */
export async function loadReminderPlan(
  tasks: Pick<TaskRepository, 'listTasksForDate'>,
  routines: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  now: Date,
  windowDays: number = REMINDER_WINDOW_DAYS,
  quietHours?: QuietHours,
): Promise<PlannedReminder[]> {
  const today = localDateString(now);
  // Moved occurrences can land in the window from a neighbouring day, so routines are
  // resolved per day in the window; tasks are listed per day.
  const dates = Array.from({ length: windowDays }, (_, i) => addDays(today, i));
  const taskLists = await Promise.all(dates.map((d) => tasks.listTasksForDate(d)));
  const active = (await routines.listRoutines()).filter((r) => !r.paused);
  const overrides = new Map(
    await Promise.all(
      active.map(async (r) => [r.id, await routines.listOccurrenceOverrides(r.id)] as const),
    ),
  );
  const routineMap = new Map(active.map((r) => [r.id, r]));
  const allTasks = taskLists.flat();
  const planned = planTaskReminders(allTasks, now, quietHours);
  // An occurrence that already became a task is reminded through that task.
  const generated = new Set(
    allTasks.filter((t) => t.routineId).map((t) => `${t.routineId}:${t.routineOccurrenceDate}`),
  );
  for (const date of dates) {
    planned.push(
      ...planRoutineReminders(
        routineOccurrencesForDate(active, overrides, date).filter(
          (i) => !generated.has(`${i.routineId}:${i.occurrence.occurrenceDate}`),
        ),
        routineMap,
        now,
        quietHours,
      ),
    );
  }
  return boundReminders(planned);
}

/** What the OS currently holds for one of our reminders (fireAt is null when unreadable). */
export type ScheduledReminder = {
  id: string;
  fireAt: number | null;
  title: string | null;
  body: string | null;
};

export type ReminderDiff = { toSchedule: PlannedReminder[]; toCancel: string[] };

/** Only identifiers made by this app are ours to manage. */
export const isReminderId = (id: string) => id.startsWith('task:') || id.startsWith('routine:');

/** One-off follow-up from a notification's Snooze button; never planned or reconciled. */
export const snoozeReminderId = (id: string) => `snooze:${id}`;

/**
 * Compares the plan with what is scheduled. Missing or changed reminders are scheduled
 * (same identifier replaces); ours that are no longer planned (deleted, completed, dismissed,
 * paused, out of window, reminders turned off) are cancelled. Foreign identifiers are left alone.
 */
export function diffReminders(
  plan: readonly PlannedReminder[],
  scheduled: readonly ScheduledReminder[],
): ReminderDiff {
  const wanted = new Map(plan.map((p) => [p.id, p]));
  const existing = new Map<string, ScheduledReminder>();
  const toCancel: string[] = [];
  for (const s of scheduled) {
    if (!isReminderId(s.id)) continue;
    if (!wanted.has(s.id)) toCancel.push(s.id);
    else existing.set(s.id, s);
  }
  const toSchedule = plan.filter((p) => {
    const s = existing.get(p.id);
    return (
      !s || s.fireAt !== p.fireAt.getTime() || s.title !== p.title || (s.body ?? null) !== p.body
    );
  });
  return { toSchedule, toCancel };
}
