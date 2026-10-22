import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { lockStatus, parseCaregiverLock, unlockUntil, type LockStatus } from './caregiverLock';

type CaregiverLock = {
  status: LockStatus;
  /** Whether the lock is switched on in Settings. */
  enabled: boolean;
  /** Opens the lock for a short while. Held in memory only. */
  unlock: () => void;
  /** Closes the lock again straight away. */
  relock: () => void;
  /** Turns the lock on or off and saves it on this device. */
  setEnabled: (enabled: boolean) => void;
  /** Plain-language message when the setting could not be loaded or saved. */
  error: string | null;
};

const CaregiverLockContext = createContext<CaregiverLock | null>(null);

/**
 * Outside the provider the lock is off, so screens still work in isolation.
 */
const noLock: CaregiverLock = {
  status: 'open',
  enabled: false,
  unlock: () => {},
  relock: () => {},
  setEnabled: () => {},
  error: null,
};

export function useCaregiverLock(): CaregiverLock {
  return useContext(CaregiverLockContext) ?? noLock;
}

/**
 * Holds the caregiver lock setting (saved locally, off by default) and the temporary unlock (in
 * memory only, so it never survives a restart). The unlock ends after a few minutes, or when the
 * app goes to the background.
 */
export function CaregiverLockProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const repo = useMemo(() => createPreferenceRepository(db), [db]);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo.getAll().then(
      (stored) => {
        if (cancelled) return;
        setEnabledState(parseCaregiverLock(stored));
        setLoaded(true);
      },
      (e: unknown) => {
        console.error(e);
        if (cancelled) return;
        // Without a readable setting the lock stays off, as it is by default.
        setError('Could not load the caregiver lock setting. It is off.');
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // Re-check at the moment the unlock ends.
  useEffect(() => {
    if (unlockedUntil === null) return;
    const wait = Math.max(0, unlockedUntil - Date.now());
    const timer = setTimeout(() => {
      setNow(Date.now());
      setUnlockedUntil(null);
    }, wait);
    return () => clearTimeout(timer);
  }, [unlockedUntil]);

  // Going to the background locks again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setUnlockedUntil(null);
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setUnlockedUntil(unlockUntil(t));
  }, []);
  const relock = useCallback(() => setUnlockedUntil(null), []);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      setError(null);
      // Turning it on from Settings keeps Settings open; "Lock now" closes it again.
      if (next) unlock();
      else setUnlockedUntil(null);
      repo.set('caregiver.lockEnabled', next).catch((e: unknown) => {
        console.error(e);
        setError('Could not save this setting. It applies now but may reset when you reopen.');
      });
    },
    [repo, unlock],
  );

  const status = lockStatus(loaded, enabled, unlockedUntil, now);
  const value = useMemo(
    () => ({ status, enabled, unlock, relock, setEnabled, error }),
    [status, enabled, unlock, relock, setEnabled, error],
  );
  return <CaregiverLockContext.Provider value={value}>{children}</CaregiverLockContext.Provider>;
}
