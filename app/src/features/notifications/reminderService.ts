import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import type { RoutineRepository } from '@/db/routineRepository';
import type { TaskRepository } from '@/db/taskRepository';
import { ensureReminderChannel, getReminderPermission } from './permissionService';
import {
  diffReminders,
  isReminderId,
  loadReminderPlan,
  type PlannedReminder,
  type ScheduledReminder,
  snoozeReminderId,
} from './reminderPlan';
import {
  applyQuietHours,
  defaultReminderSettings,
  type ReminderSettings,
} from './reminderSettings';

const reminderCategoryId = 'reminder';
const snoozeActionId = 'snooze';

/**
 * One-time setup: show reminders that arrive while the app is open (sound only if the
 * notification asks for it) and register the Snooze button. Safe to call more than once.
 */
export async function setUpReminderNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: notification.request.content.sound != null,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationCategoryAsync(reminderCategoryId, [
    // Foregrounds the app so the tap is delivered even when the app was closed.
    { identifier: snoozeActionId, buttonTitle: 'Snooze', options: { opensAppToForeground: true } },
  ]);
}

async function scheduleContent(
  identifier: string,
  content: { title: string; body: string | null; data: Record<string, unknown> },
  fireAt: Date,
  settings: ReminderSettings,
): Promise<void> {
  const channelId = await ensureReminderChannel(settings);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: content.title,
      body: content.body ?? undefined,
      data: content.data,
      categoryIdentifier: reminderCategoryId,
      // iOS has no per-notification vibration setting; Android takes sound and vibration
      // from the channel.
      sound: settings.sound ? 'default' : false,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
  });
}

/** Schedules one reminder. Reusing an identifier replaces the earlier notification. */
export async function scheduleReminder(
  reminder: PlannedReminder,
  settings: ReminderSettings = defaultReminderSettings,
): Promise<void> {
  await scheduleContent(reminder.id, reminder, reminder.fireAt, settings);
}

/**
 * Reminds once more after the user's snooze interval (moved out of quiet hours). Uses its own
 * identifier so tapping Snooze again replaces the earlier snooze.
 */
export async function snoozeNotification(
  request: Notifications.NotificationRequest,
  settings: ReminderSettings,
  now: Date = new Date(),
): Promise<void> {
  const base = request.identifier.replace(/^snooze:/, '');
  const fireAt = applyQuietHours(
    new Date(now.getTime() + settings.snoozeMinutes * 60_000),
    settings.quietHours,
  );
  await scheduleContent(
    snoozeReminderId(base),
    {
      title: request.content.title ?? 'Reminder',
      body: request.content.body ?? null,
      data: (request.content.data ?? {}) as Record<string, unknown>,
    },
    fireAt,
    settings,
  );
}

export { snoozeActionId };

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Schedules reminders for tasks and routine occurrences in the next few days. Does nothing
 * unless the user has allowed notifications; it never prompts. Returns how many were
 * scheduled.
 * Prefer `reconcileReminders`, which also cancels stale ones.
 */
export async function scheduleUpcomingReminders(
  tasks: Pick<TaskRepository, 'listTasksForDate'>,
  routines: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  now: Date = new Date(),
  settings: ReminderSettings = defaultReminderSettings,
): Promise<number> {
  if ((await getReminderPermission()) !== 'granted') return 0;
  const plan = await loadReminderPlan(tasks, routines, now, undefined, settings.quietHours);
  for (const reminder of plan) await scheduleReminder(reminder, settings);
  return plan.length;
}

function toScheduled(request: Notifications.NotificationRequest): ScheduledReminder {
  const trigger = request.trigger as { type?: string; value?: unknown } | null;
  const value = trigger?.type === 'date' ? trigger.value : null;
  return {
    id: request.identifier,
    fireAt: typeof value === 'number' ? value : null,
    title: request.content.title ?? null,
    body: request.content.body ?? null,
  };
}

export type ReconcileResult = { scheduled: number; cancelled: number };

export type ReconcileOptions = {
  settings?: ReminderSettings;
  /** Reschedule everything, not just what changed (needed after a sound/vibration change). */
  force?: boolean;
};

async function reconcileOnce(
  tasks: Pick<TaskRepository, 'listTasksForDate'>,
  routines: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  now: Date,
  { settings = defaultReminderSettings, force = false }: ReconcileOptions,
): Promise<ReconcileResult> {
  if ((await getReminderPermission()) !== 'granted') return { scheduled: 0, cancelled: 0 };
  const plan = await loadReminderPlan(tasks, routines, now, undefined, settings.quietHours);
  const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((r) =>
    isReminderId(r.identifier),
  );
  const diff = diffReminders(plan, existing.map(toScheduled));
  const toCancel = diff.toCancel;
  const toSchedule = force ? plan : diff.toSchedule;
  for (const id of toCancel) await cancelReminder(id);
  for (const reminder of toSchedule) await scheduleReminder(reminder, settings);
  return { scheduled: toSchedule.length, cancelled: toCancel.length };
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Makes the scheduled notifications match the planner: schedules missing or changed ones and
 * cancels stale ones. Does nothing unless permission is already granted; never prompts. Calls
 * are queued so overlapping triggers (startup, foreground, saves) cannot race each other.
 */
export function reconcileReminders(
  tasks: Pick<TaskRepository, 'listTasksForDate'>,
  routines: Pick<RoutineRepository, 'listRoutines' | 'listOccurrenceOverrides'>,
  now: Date = new Date(),
  options: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const run = queue.then(() => reconcileOnce(tasks, routines, now, options));
  queue = run.catch(() => undefined);
  return run;
}
