import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { toReminderPermission, type ReminderPermission } from './permission';
import {
  defaultReminderSettings,
  reminderChannelFor,
  type ReminderSettings,
} from './reminderSettings';

/**
 * Creates (or updates) the Android channel for a sound/vibration choice and returns its id.
 * Android fixes a channel's sound and vibration once created, so each combination has its own
 * channel. Android 13+ also needs a channel before it shows the permission prompt.
 */
export async function ensureReminderChannel(
  settings: Pick<ReminderSettings, 'sound' | 'vibration'>,
): Promise<string> {
  const id = reminderChannelFor(settings);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(id, {
      name: `Reminders${settings.sound ? '' : ' (silent)'}${settings.vibration ? '' : ' (no vibration)'}`,
      importance: AndroidImportance.DEFAULT,
      sound: settings.sound ? 'default' : null,
      enableVibrate: settings.vibration,
    });
  }
  return id;
}

/** Reads the current OS permission without prompting. */
export async function getReminderPermission(): Promise<ReminderPermission> {
  return toReminderPermission(await Notifications.getPermissionsAsync());
}

/** Asks the OS for permission. Call only after the user chose to turn reminders on. */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  await ensureReminderChannel(defaultReminderSettings);
  return toReminderPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}
