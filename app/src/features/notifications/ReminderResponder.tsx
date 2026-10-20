import * as Notifications from 'expo-notifications';
import { useEffect, useMemo } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { setUpReminderNotifications, snoozeActionId, snoozeNotification } from './reminderService';
import { defaultReminderSettings, parseReminderSettings } from './reminderSettings';

/**
 * Sets up reminder notifications (foreground display, Snooze button) and handles Snooze taps,
 * including one that launched the app. Renders nothing.
 */
export function ReminderResponder() {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);

  useEffect(() => {
    const handled = new Set<string>();
    const handle = async (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== snoozeActionId) return;
      const key = `${response.notification.request.identifier}@${response.notification.date}`;
      if (handled.has(key)) return;
      handled.add(key);
      try {
        const settings = await prefs
          .getAll()
          .then(parseReminderSettings, () => defaultReminderSettings);
        await snoozeNotification(response.notification.request, settings);
        // Not shown to the user: the notification already went away; a failed snooze is logged.
      } catch (e) {
        console.error('Could not snooze the reminder', e);
      } finally {
        Notifications.clearLastNotificationResponse();
      }
    };

    setUpReminderNotifications().catch((e: unknown) =>
      console.error('Could not set up reminder notifications', e),
    );
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    // A Snooze tap that started the app arrives before the listener exists.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) void handle(r);
    });
    return () => sub.remove();
  }, [prefs]);

  return null;
}
