import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useDatabase } from '@/db/DatabaseProvider';
import { createForecastCacheRepository } from '@/db/forecastCacheRepository';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { createWeatherSettingsRepository } from '@/db/weatherSettingsRepository';
import { GeocodingError, searchPlaces, type PlaceResult } from './geocoding';
import { getLocationPermission, requestLocationPermission } from './locationService';
import {
  defaultWeatherSettings,
  parseWeatherSettings,
  roundCoordinate,
  type LocationPermission,
  type WeatherSettings,
} from './weatherSettings';

export type WeatherSettingsControls = {
  settings: WeatherSettings;
  loaded: boolean;
  /** Null until read; only read (never requested) unless the user picks device location. */
  permission: LocationPermission | null;
  results: PlaceResult[] | null;
  searching: boolean;
  error: string | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  useDeviceLocation: () => Promise<void>;
  search: (text: string) => Promise<void>;
  choosePlace: (place: PlaceResult) => Promise<void>;
  removeLocation: () => Promise<void>;
  openSystemSettings: () => Promise<void>;
};

/**
 * Loads and saves the weather choice. Weather is off by default. The OS location prompt only
 * appears from `useDeviceLocation`, and searches only run after weather is enabled.
 */
export function useWeatherSettings(): WeatherSettingsControls {
  const db = useDatabase();
  const prefs = useMemo(() => createPreferenceRepository(db), [db]);
  const repo = useMemo(() => createWeatherSettingsRepository(db), [db]);
  const cache = useMemo(() => createForecastCacheRepository(db), [db]);
  const [settings, setSettings] = useState<WeatherSettings>(defaultWeatherSettings);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [stored, row] = await Promise.all([prefs.getAll(), repo.get()]);
    setSettings(parseWeatherSettings(row, stored['weather.enabled']));
  }, [prefs, repo]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([prefs.getAll(), repo.get()]).then(
      ([stored, row]) => {
        if (cancelled) return;
        setSettings(parseWeatherSettings(row, stored['weather.enabled']));
        setLoaded(true);
      },
      (e: unknown) => {
        console.error(e);
        if (cancelled) return;
        setError('Could not load your weather settings. Weather is shown as off.');
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [prefs, repo]);

  // Read the permission (no prompt) only once weather is on, and again when returning from the
  // device settings.
  const enabled = settings.enabled;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const refresh = () => {
      getLocationPermission().then(
        (p) => {
          if (!cancelled) setPermission(p);
        },
        (e: unknown) => console.error(e),
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
  }, [enabled]);

  const run = useCallback(
    async (message: string, task: () => Promise<void>) => {
      setError(null);
      try {
        await task();
        await reload();
      } catch (e) {
        console.error(e);
        setError(message);
      }
    },
    [reload],
  );

  const clearLocal = useCallback(async () => {
    setResults(null);
    await repo.clear();
    await cache.clear();
  }, [repo, cache]);

  const setEnabled = useCallback(
    (next: boolean) =>
      run('Could not save the weather choice.', async () => {
        if (next) {
          await prefs.set('weather.enabled', true);
        } else {
          // Turning weather off deletes the saved location and the cached forecast.
          await clearLocal();
          await prefs.set('weather.enabled', false);
        }
      }),
    [prefs, clearLocal, run],
  );

  const useDeviceLocation = useCallback(
    () =>
      run(
        'Could not ask for location permission. You can search for a place instead.',
        async () => {
          const next = await requestLocationPermission();
          setPermission(next);
          if (next === 'granted') {
            setResults(null);
            await repo.setDevice();
            await cache.clear();
          }
        },
      ),
    [repo, cache, run],
  );

  const search = useCallback(async (text: string) => {
    setError(null);
    setSearching(true);
    try {
      setResults(await searchPlaces(text));
    } catch (e) {
      setResults(null);
      setError(e instanceof GeocodingError ? e.message : 'Could not search for places.');
    } finally {
      setSearching(false);
    }
  }, []);

  const choosePlace = useCallback(
    (place: PlaceResult) =>
      run('Could not save that place.', async () => {
        setResults(null);
        await repo.setManual({
          label: place.label,
          latitude: roundCoordinate(place.latitude),
          longitude: roundCoordinate(place.longitude),
        });
        await cache.clear();
      }),
    [repo, cache, run],
  );

  const removeLocation = useCallback(
    () => run('Could not remove the saved location.', clearLocal),
    [clearLocal, run],
  );

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error(e);
      setError('Could not open the device settings. Open them yourself to allow location.');
    }
  }, []);

  return {
    settings,
    loaded,
    permission: enabled ? permission : null,
    results,
    searching,
    error,
    setEnabled,
    useDeviceLocation,
    search,
    choosePlace,
    removeLocation,
    openSystemSettings,
  };
}
