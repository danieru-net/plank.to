import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';

const KEY = 'clothing.dismissed';

/** Whether the clothing ideas were dismissed for the current local day. Stored on this device. */
export function useClothingDismissed() {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      prefs.getAll().then(
        (stored) => {
          if (cancelled) return;
          const raw = stored[KEY] as { date?: unknown } | undefined;
          setDismissed(raw?.date === toLocalDateString(new Date()));
        },
        (e: unknown) => console.error(e),
      );
      return () => {
        cancelled = true;
      };
    }, [prefs]),
  );

  const dismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await prefs.set(KEY, { date: toLocalDateString(new Date()) });
    } catch (e) {
      console.error(e);
      setError('Could not save that. It may reappear next time.');
    }
  }, [prefs]);

  return { dismissed, dismiss, error };
}
