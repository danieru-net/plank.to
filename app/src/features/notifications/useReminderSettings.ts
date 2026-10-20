import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import type { PreferenceValues } from '@/db/types';
import { useReconcileReminders } from './useReminderReconciler';
import {
  defaultReminderSettings,
  parseReminderSettings,
  type ReminderSettings,
} from './reminderSettings';

const keyFor = {
  defaultAdvanceMinutes: 'reminders.defaultAdvanceMinutes',
  snoozeMinutes: 'reminders.snoozeMinutes',
  quietHours: 'reminders.quietHours',
  sound: 'reminders.sound',
  vibration: 'reminders.vibration',
} as const satisfies Record<keyof ReminderSettings, keyof PreferenceValues>;

export type ReminderSettingsControls = {
  settings: ReminderSettings;
  /** False until the saved settings have been read. */
  loaded: boolean;
  update: (patch: Partial<ReminderSettings>) => void;
  reset: () => void;
  /** Plain-language message when the last load or save failed; cleared on the next success. */
  error: string | null;
};

/**
 * Loads and saves the device-wide reminder settings. A change applies immediately, is saved
 * locally, and then reschedules reminders so it takes effect on what is already planned.
 */
export function useReminderSettings(): ReminderSettingsControls {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const reconcile = useReconcileReminders();
  const [settings, setSettings] = useState<ReminderSettings>(defaultReminderSettings);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    prefs.getAll().then(
      (stored) => {
        if (cancelled) return;
        setSettings(parseReminderSettings(stored));
        setLoaded(true);
      },
      (e: unknown) => {
        console.error(e);
        if (cancelled) return;
        setError('Could not load your saved reminder settings. Defaults are used.');
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [prefs]);

  const update = useCallback(
    (patch: Partial<ReminderSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      setError(null);
      const writes = (Object.keys(patch) as (keyof ReminderSettings)[]).map((k) =>
        // Each key has a matching value type in PreferenceValues.
        prefs.set(keyFor[k], patch[k] as never),
      );
      Promise.all(writes)
        .catch((e: unknown) => {
          console.error(e);
          setError('Could not save this setting. It will apply now but may reset when you reopen.');
        })
        .then(() => reconcile({ force: true }));
    },
    [prefs, reconcile],
  );

  const reset = useCallback(() => {
    setSettings(defaultReminderSettings);
    setError(null);
    Promise.all(Object.values(keyFor).map((k) => prefs.remove(k)))
      .catch((e: unknown) => {
        console.error(e);
        setError('Could not reset the saved settings.');
      })
      .then(() => reconcile({ force: true }));
  }, [prefs, reconcile]);

  return { settings, loaded, update, reset, error };
}
