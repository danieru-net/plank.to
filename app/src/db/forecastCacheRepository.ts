import type { Forecast } from '@/features/weather/forecast';
import type { ForecastStore } from '@/features/weather/forecastCache';
import { createPreferenceRepository } from './preferenceRepository';
import type { TaskDb } from './taskRepository';

const KEY = 'weather.forecastCache';

/** Stores the one cached forecast as a JSON value in the preferences table. */
export function createForecastCacheRepository(
  db: TaskDb,
  options: { now?: () => number } = {},
): ForecastStore {
  const prefs = createPreferenceRepository(db, options);
  return {
    async load() {
      return (await prefs.getAll())[KEY] ?? null;
    },
    save: (forecast: Forecast) => prefs.set(KEY, forecast),
    clear: () => prefs.remove(KEY),
  };
}
