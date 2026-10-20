import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createForecastCacheRepository } from '@/db/forecastCacheRepository';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { createWeatherSettingsRepository } from '@/db/weatherSettingsRepository';
import { parseStoredForecast, REFRESH_AFTER_MS } from './forecastCache';
import { getApproximatePosition, getLocationPermission } from './locationService';
import type { TodayWeatherState } from './weatherDisplay';
import { getWeather } from './weatherService';
import { parseWeatherSettings } from './weatherSettings';

/**
 * Loads weather for Today. Runs when Today gains focus (and when the app returns to the
 * foreground while Today is focused); `getWeather` reuses a forecast younger than 30 minutes,
 * so this does not poll. With weather off nothing is requested. In device mode a position is
 * only read when permission is already granted (never prompting) and the cached forecast is
 * too old to reuse.
 */
export function useTodayWeather() {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const settingsRepo = useMemo(() => createWeatherSettingsRepository(db), [db]);
  const cache = useMemo(() => createForecastCacheRepository(db), [db]);
  const [state, setState] = useState<TodayWeatherState>({ status: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  const run = useRef(0);
  const focused = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      const id = ++run.current;
      const commit = (next: TodayWeatherState) => {
        if (id !== run.current) return;
        setNow(Date.now());
        setState(next);
      };
      try {
        const [stored, row] = await Promise.all([prefs.getAll(), settingsRepo.get()]);
        const settings = parseWeatherSettings(row, stored['weather.enabled']);
        if (!settings.enabled) {
          commit({ status: 'result', result: { status: 'unavailable', reason: 'disabled' } });
          return;
        }
        let deviceLocation: { latitude: number; longitude: number } | null = null;
        if (settings.location.mode === 'device') {
          const permission = await getLocationPermission();
          if (permission !== 'granted') {
            commit({ status: 'permission', permission });
            return;
          }
          const cached = parseStoredForecast(await cache.load().catch(() => null));
          if (cached && !force && Date.now() - cached.fetchedAt < REFRESH_AFTER_MS) {
            deviceLocation = { latitude: cached.latitude, longitude: cached.longitude };
          } else {
            deviceLocation = await getApproximatePosition().catch(() => null);
            if (!deviceLocation) {
              commit({ status: 'position_failed' });
              return;
            }
          }
        }
        const result = await getWeather({ settings, deviceLocation, store: cache, force });
        commit({ status: 'result', result });
      } catch (e) {
        console.error(e);
        commit({ status: 'settings_failed' });
      }
    },
    [prefs, settingsRepo, cache],
  );

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void load(false);
      return () => {
        focused.current = false;
        run.current++;
      };
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && focused.current) void load(false);
    });
    return () => sub.remove();
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void load(true);
  }, [load]);

  return { state, now, retry };
}
