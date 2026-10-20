import { fetchForecast, ForecastError, type Forecast, type WeatherUnits } from './forecast';
import {
  cacheState,
  matchesRequest,
  parseStoredForecast,
  REFRESH_AFTER_MS,
  type CacheState,
  type ForecastStore,
} from './forecastCache';
import { roundCoordinate, type WeatherSettings } from './weatherSettings';

export type WeatherResult =
  /** Weather is off, or no place is known yet: nothing was read or requested. */
  | { status: 'unavailable'; reason: 'disabled' | 'no_location' }
  | { status: 'ok'; forecast: Forecast; freshness: CacheState }
  /** The request failed. `forecast` is the cached one for the same place, if still usable. */
  | {
      status: 'error';
      error: ForecastError;
      forecast: Forecast | null;
      freshness: CacheState | null;
    };

/**
 * Returns the forecast for the current settings. Rules (docs/location-privacy.md):
 * no request and no cache read while weather is off; the device position (`deviceLocation`) is
 * supplied by the caller only for device mode; a cache younger than 30 minutes is reused;
 * a failure never retries, and falls back to the cached forecast shown as stale.
 * Pass `force` only for an explicit user refresh. It still honours nothing else, so UI should
 * not call it in a loop.
 */
export async function getWeather(args: {
  settings: WeatherSettings;
  /** Rounded device position; required in device mode, ignored otherwise. */
  deviceLocation?: { latitude: number; longitude: number } | null;
  units?: WeatherUnits;
  store: ForecastStore;
  fetchImpl?: typeof fetch;
  now?: () => number;
  force?: boolean;
}): Promise<WeatherResult> {
  const { settings, store, units = 'metric', force = false } = args;
  const now = args.now ?? Date.now;
  if (!settings.enabled) return { status: 'unavailable', reason: 'disabled' };

  let place: { latitude: number; longitude: number } | null = null;
  if (settings.location.mode === 'manual') {
    place = settings.location;
  } else if (settings.location.mode === 'device' && args.deviceLocation) {
    place = args.deviceLocation;
  }
  if (!place) return { status: 'unavailable', reason: 'no_location' };
  const target = {
    latitude: roundCoordinate(place.latitude),
    longitude: roundCoordinate(place.longitude),
  };

  let cached: Forecast | null = null;
  try {
    cached = parseStoredForecast(await store.load());
  } catch (e) {
    console.error(e);
  }
  if (
    cached &&
    (!matchesRequest(cached, target, units) || cacheState(cached, now()) === 'expired')
  ) {
    await store.clear().catch((e: unknown) => console.error(e));
    cached = null;
  }
  if (cached && !force && now() - cached.fetchedAt < REFRESH_AFTER_MS) {
    return { status: 'ok', forecast: cached, freshness: cacheState(cached, now()) };
  }

  try {
    const forecast = await fetchForecast(target, { units, fetchImpl: args.fetchImpl, now });
    await store.save(forecast).catch((e: unknown) => console.error(e));
    return { status: 'ok', forecast, freshness: 'fresh' };
  } catch (e) {
    const error =
      e instanceof ForecastError
        ? e
        : new ForecastError('provider', 'Weather is not available right now.');
    return {
      status: 'error',
      error,
      forecast: cached,
      freshness: cached ? cacheState(cached, now()) : null,
    };
  }
}
