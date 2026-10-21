import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';

import { hasDraftText, parseFeedbackDraft } from './feedbackDraft';
import type { FeedbackForm } from './feedbackMessage';

const draftKey = 'feedback.draft';
const saveDelayMs = 500;

/**
 * Keeps the feedback form in the local database so leaving the screen or switching to the mail
 * app doesn't lose it. `restored` is the saved draft (or null), available once `loaded` is true.
 * Call `save` with the current form on every change, and `clear` once the mail has been sent.
 */
export function useFeedbackDraft() {
  const db = useDatabase();
  const repo = useMemo(() => createPreferenceRepository(db), [db]);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState<FeedbackForm | null>(null);
  const pending = useRef<FeedbackForm | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo.getAll().then(
      (stored) => {
        if (cancelled) return;
        setRestored(parseFeedbackDraft(stored[draftKey]));
        setLoaded(true);
      },
      (e: unknown) => {
        console.error(e);
        if (!cancelled) setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const form = pending.current;
    if (!form) return;
    pending.current = null;
    const write = hasDraftText(form) ? repo.set(draftKey, form) : repo.remove(draftKey);
    write.catch((e: unknown) => console.error(e));
  }, [repo]);

  const save = useCallback(
    (form: FeedbackForm) => {
      pending.current = form;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, saveDelayMs);
    },
    [flush],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    repo.remove(draftKey).catch((e: unknown) => console.error(e));
  }, [repo]);

  // Write straight away when the app goes to the background (e.g. the `mailto:` fallback opens
  // another app) and when the screen closes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);

  return { loaded, restored, save, flush, clear };
}
