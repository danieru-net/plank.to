/** What the app knows about notification permission, independent of the platform API. */
export type ReminderPermission = 'undetermined' | 'granted' | 'denied';

export type PermissionResponseLike = {
  status: string;
  granted: boolean;
};

/** Maps an OS permission response to the app's three states. */
export function toReminderPermission(response: PermissionResponseLike): ReminderPermission {
  if (response.granted || response.status === 'granted') return 'granted';
  if (response.status === 'denied') return 'denied';
  return 'undetermined';
}

export const reminderExplanation =
  'Reminders are optional. If you turn them on, Plank can send a notification at the time you set for a task or routine. Everything stays on this device, and you can use Plank fully without them.';

export const permissionStatusText: Record<ReminderPermission, string> = {
  undetermined: 'Reminders are off. Plank has not asked for permission yet.',
  granted: 'Reminders are allowed on this device.',
  denied:
    'Reminders are blocked in your device settings. Plank works without them. You can allow them in Settings whenever you like.',
};
