import { toStorageError } from './errors';
import type { TaskDb } from './taskRepository';
import type { WeatherLocationMode, WeatherLocationSettingsRow } from './types';

export type WeatherSettingsRepository = ReturnType<typeof createWeatherSettingsRepository>;

/**
 * Access to the single `weather_location_settings` row. Only a manual location stores
 * coordinates (already rounded by the caller); device location is read on demand, not stored.
 */
export function createWeatherSettingsRepository(db: TaskDb, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  const failed = (message: string, e: unknown) => toStorageError('query_failed', message, e);

  async function write(
    mode: WeatherLocationMode,
    label: string | null,
    latitude: number | null,
    longitude: number | null,
  ): Promise<void> {
    const t = now();
    try {
      await db.runAsync(
        `INSERT INTO weather_location_settings
           (id, mode, manual_label, manual_latitude, manual_longitude, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, manual_label = excluded.manual_label,
           manual_latitude = excluded.manual_latitude, manual_longitude = excluded.manual_longitude,
           updated_at = excluded.updated_at`,
        [mode, label, latitude, longitude, t, t],
      );
    } catch (e) {
      throw failed('Could not save your weather location.', e);
    }
  }

  return {
    async get(): Promise<WeatherLocationSettingsRow | null> {
      try {
        return await db.getFirstAsync<WeatherLocationSettingsRow>(
          'SELECT * FROM weather_location_settings WHERE id = 1',
          [],
        );
      } catch (e) {
        throw failed('Could not load your weather settings.', e);
      }
    },
    setDevice: () => write('device', null, null, null),
    setManual: (place: { label: string; latitude: number; longitude: number }) =>
      write('manual', place.label, place.latitude, place.longitude),
    /** Back to "no location": deletes any saved place name and coordinates. */
    clear: () => write('off', null, null, null),
  };
}
