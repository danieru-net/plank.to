import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { AppearanceContext, buildAppearance } from './context';
import { defaultAppearance, parseAppearance, type AppearanceSettings } from './settings';

type Controls = {
  update: (patch: Partial<AppearanceSettings>) => void;
  reset: () => void;
  /** Plain-language message when the last save or load failed; cleared on the next success. */
  error: string | null;
};

const ControlsContext = createContext<Controls | null>(null);

export function useAppearanceControls(): Controls {
  const c = useContext(ControlsContext);
  if (!c) throw new Error('useAppearanceControls must be used inside AppearanceProvider');
  return c;
}

const keyFor = {
  textScale: 'display.textScale',
  density: 'display.density',
  colorTheme: 'display.colorTheme',
  motion: 'display.motion',
  haptics: 'display.haptics',
  taskActions: 'display.taskActions',
} as const;

/** Loads saved appearance settings, applies them app-wide, and saves changes locally. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const repo = useMemo(() => createPreferenceRepository(db), [db]);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const reducedMotion = useReducedMotion();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultAppearance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo.getAll().then(
      (stored) => {
        if (!cancelled) setSettings(parseAppearance(stored));
      },
      (e: unknown) => {
        console.error(e);
        if (!cancelled) setError('Could not load your saved display settings. Defaults are used.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const update = useCallback(
    (patch: Partial<AppearanceSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      setError(null);
      const writes = (Object.keys(patch) as (keyof AppearanceSettings)[]).map((k) =>
        // Each key has a matching value type in PreferenceValues.
        repo.set(keyFor[k], patch[k] as never),
      );
      Promise.all(writes).catch((e: unknown) => {
        console.error(e);
        setError('Could not save this setting. It will apply now but may reset when you reopen.');
      });
    },
    [repo],
  );

  const reset = useCallback(() => {
    setSettings(defaultAppearance);
    setError(null);
    Promise.all(Object.values(keyFor).map((k) => repo.remove(k))).catch((e: unknown) => {
      console.error(e);
      setError('Could not reset the saved settings.');
    });
  }, [repo]);

  const appearance = useMemo(
    () => buildAppearance(settings, scheme, reducedMotion),
    [settings, scheme, reducedMotion],
  );
  const controls = useMemo(() => ({ update, reset, error }), [update, reset, error]);

  return (
    <AppearanceContext.Provider value={appearance}>
      <ControlsContext.Provider value={controls}>{children}</ControlsContext.Provider>
    </AppearanceContext.Provider>
  );
}
