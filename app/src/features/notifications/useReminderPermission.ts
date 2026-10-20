import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { useReconcileReminders } from './useReminderReconciler';
import type { ReminderPermission } from './permission';
import { getReminderPermission, requestReminderPermission } from './permissionService';

export type ReminderPermissionState = {
  /** Null until first read. */
  permission: ReminderPermission | null;
  /** True once the user chose "Not now" on Today. */
  dismissed: boolean;
  /** Plain-language message when reading, requesting, or saving failed. */
  error: string | null;
  request: () => Promise<void>;
  dismiss: () => Promise<void>;
  openSystemSettings: () => Promise<void>;
};

/** Tracks notification permission (re-read when the app returns to the foreground). */
export function useReminderPermission(): ReminderPermissionState {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const reconcile = useReconcileReminders();
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getReminderPermission().then(
        (p) => {
          if (!cancelled) setPermission(p);
        },
        (e: unknown) => {
          console.error(e);
          if (!cancelled) setError('Could not check the reminder permission on this device.');
        },
      );
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    prefs.getAll().then(
      (stored) => {
        if (!cancelled) setDismissed(stored['reminders.promptDismissed'] === true);
      },
      (e: unknown) => console.error(e),
    );
    return () => {
      cancelled = true;
    };
  }, [prefs]);

  const request = useCallback(async () => {
    setError(null);
    try {
      const next = await requestReminderPermission();
      setPermission(next);
      if (next === 'granted') void reconcile();
    } catch (e) {
      console.error(e);
      setError('Could not ask for the reminder permission. You can keep using Plank without it.');
    }
  }, [reconcile]);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await prefs.set('reminders.promptDismissed', true);
    } catch (e) {
      console.error(e);
      setError('Could not save that choice. It may show again when you reopen the app.');
    }
  }, [prefs]);

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error(e);
      setError('Could not open the device settings. Open them yourself to allow reminders.');
    }
  }, []);

  return { permission, dismissed, error, request, dismiss, openSystemSettings };
}
