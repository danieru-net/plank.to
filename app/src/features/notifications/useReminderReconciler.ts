import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { useTaskRepository } from '@/features/tasks/useTaskRepository';
import { reconcileReminders } from './reminderService';
import { defaultReminderSettings, parseReminderSettings } from './reminderSettings';

/**
 * Returns a function that reconciles scheduled reminders with the planner, using the current
 * reminder settings. Failures are logged, not shown: reminders are optional and the planner
 * data is already saved. Pass `{ force: true }` to reschedule everything.
 */
export function useReconcileReminders() {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const tasks = useTaskRepository();
  const routines = useRoutineRepository();
  return useCallback(
    async (options?: { force?: boolean }) => {
      try {
        const settings = await prefs
          .getAll()
          .then(parseReminderSettings, () => defaultReminderSettings);
        await reconcileReminders(tasks, routines, new Date(), {
          settings,
          force: options?.force === true,
        });
      } catch (e) {
        console.error('Could not update reminders', e);
      }
    },
    [prefs, tasks, routines],
  );
}

/** Reconciles on startup and whenever the app returns to the foreground. */
export function ReminderReconciler() {
  const reconcile = useReconcileReminders();
  useEffect(() => {
    void reconcile();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reconcile();
    });
    return () => sub.remove();
  }, [reconcile]);
  return null;
}
