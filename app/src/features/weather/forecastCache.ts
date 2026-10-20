/**
 * Cache policy for the single stored forecast (docs/location-privacy.md "Cache policy"):
 * refresh at most every 30 minutes, show as stale after 3 hours, discard after 24 hours, and
 * only for the location and units it was fetched for.
 */
import type { Forecast, WeatherUnits } from './forecast';

export const REFRESH_AFTER_MS = 30 * 60 * 1000;
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
export const DISCARD_AFTER_MS = 24 * 60 * 60 * 1000;

/** Where the one cached forecast lives. Implemented over the local database. */
export type ForecastStore = {
  load: () => Promise<unknown>;
  save: (forecast: Forecast) => Promise<void>;
  clear: () => Promise<void>;
};

export type CacheState = 'fresh' | 'stale' | 'expired';

export function cacheState(forecast: Pick<Forecast, 'fetchedAt'>, now: number): CacheState {
  const age = now - forecast.fetchedAt;
  if (!(age >= 0) || age >= DISCARD_AFTER_MS) return 'expired';
  return age >= STALE_AFTER_MS ? 'stale' : 'fresh';
}

/** Validates stored JSON; anything malformed is treated as no cache. */
export function parseStoredForecast(raw: unknown): Forecast | null {
  const f = raw as Partial<Forecast> | null;
  if (
    !f ||
    typeof f !== 'object' ||
    typeof f.fetchedAt !== 'number' ||
    typeof f.latitude !== 'number' ||
    typeof f.longitude !== 'number' ||
    (f.units !== 'metric' && f.units !== 'imperial') ||
    !f.current ||
    typeof f.current.temperature !== 'number' ||
    typeof f.current.weatherCode !== 'number' ||
    typeof f.current.time !== 'string' ||
    !Array.isArray(f.hourly) ||
    !Array.isArray(f.daily)
  ) {
    return null;
  }
  return f as Forecast;
}

export function matchesRequest(
  forecast: Forecast,
  place: { latitude: number; longitude: number },
  units: WeatherUnits,
): boolean {
  return (
    forecast.latitude === place.latitude &&
    forecast.longitude === place.longitude &&
    forecast.units === units
  );
}
