import type { Forecast } from './forecast';
import { cacheState, DISCARD_AFTER_MS, STALE_AFTER_MS } from './forecastCache';
import type { ForecastStore } from './forecastCache';
import { getWeather } from './weatherService';
import type { WeatherSettings } from './weatherSettings';

const manual: WeatherSettings = {
  enabled: true,
  location: { mode: 'manual', label: 'Oslo', latitude: 59.91, longitude: 10.75 },
};

const apiBody = {
  current: { time: '2026-10-19T12:00', temperature_2m: 8, weather_code: 3 },
};
const okFetch = () =>
  jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => apiBody });

function memoryStore(initial: Forecast | null = null) {
  let value: unknown = initial;
  const store: ForecastStore & { value: () => unknown } = {
    load: jest.fn(async () => value),
    save: jest.fn(async (f: Forecast) => {
      value = f;
    }),
    clear: jest.fn(async () => {
      value = null;
    }),
    value: () => value,
  };
  return store;
}

const forecastAt = (fetchedAt: number, over: Partial<Forecast> = {}): Forecast => ({
  latitude: 59.91,
  longitude: 10.75,
  units: 'metric',
  fetchedAt,
  current: {
    time: 't',
    temperature: 1,
    apparentTemperature: null,
    precipitation: null,
    weatherCode: 0,
    windSpeed: null,
    isDay: null,
  },
  hourly: [],
  daily: [],
  ...over,
});

describe('getWeather', () => {
  it('makes no request and reads no cache while weather is off', async () => {
    const fetchImpl = okFetch();
    const store = memoryStore();
    const r = await getWeather({
      settings: { enabled: false, location: { mode: 'off' } },
      store,
      fetchImpl,
    });
    expect(r).toEqual({ status: 'unavailable', reason: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(store.load).not.toHaveBeenCalled();
  });

  it('makes no request without a location', async () => {
    const fetchImpl = okFetch();
    const store = memoryStore();
    for (const location of [{ mode: 'off' }, { mode: 'device' }] as const) {
      const r = await getWeather({ settings: { enabled: true, location }, store, fetchImpl });
      expect(r).toEqual({ status: 'unavailable', reason: 'no_location' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches, saves, and rounds a device position', async () => {
    const fetchImpl = okFetch();
    const store = memoryStore();
    const r = await getWeather({
      settings: { enabled: true, location: { mode: 'device' } },
      deviceLocation: { latitude: 40.71278, longitude: -74.00594 },
      store,
      fetchImpl,
      now: () => 100,
    });
    expect(r.status).toBe('ok');
    expect(String(fetchImpl.mock.calls[0][0])).toContain('latitude=40.71');
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it('reuses a cache younger than 30 minutes without a request', async () => {
    const fetchImpl = okFetch();
    const store = memoryStore(forecastAt(1_000_000));
    const r = await getWeather({
      settings: manual,
      store,
      fetchImpl,
      now: () => 1_000_000 + 10 * 60 * 1000,
    });
    expect(r).toMatchObject({ status: 'ok', freshness: 'fresh' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refreshes after 30 minutes, and on force', async () => {
    const store = memoryStore(forecastAt(0));
    const fetchImpl = okFetch();
    await getWeather({ settings: manual, store, fetchImpl, now: () => 31 * 60 * 1000 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const fetch2 = okFetch();
    await getWeather({
      settings: manual,
      store,
      fetchImpl: fetch2,
      now: () => 31 * 60 * 1000 + 1,
      force: true,
    });
    expect(fetch2).toHaveBeenCalledTimes(1);
  });

  it('falls back to the cache as stale on provider failure, without retrying', async () => {
    const store = memoryStore(forecastAt(0));
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    const r = await getWeather({
      settings: manual,
      store,
      fetchImpl,
      now: () => STALE_AFTER_MS + 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ status: 'error', freshness: 'stale' });
    if (r.status === 'error') {
      expect(r.error.kind).toBe('rate_limited');
      expect(r.forecast).not.toBeNull();
    }
  });

  it('discards a cache older than 24 hours', async () => {
    const store = memoryStore(forecastAt(0));
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    const r = await getWeather({ settings: manual, store, fetchImpl, now: () => DISCARD_AFTER_MS });
    expect(store.clear).toHaveBeenCalled();
    expect(r).toMatchObject({ status: 'error', forecast: null, freshness: null });
  });

  it('discards a cache for another place or units', async () => {
    const store = memoryStore(forecastAt(0, { latitude: 1 }));
    const fetchImpl = okFetch();
    await getWeather({ settings: manual, store, fetchImpl, now: () => 60_000 });
    expect(store.clear).toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a corrupt cache as empty', async () => {
    const store = memoryStore();
    (store.load as jest.Mock).mockResolvedValue({ nonsense: true });
    const fetchImpl = okFetch();
    const r = await getWeather({ settings: manual, store, fetchImpl, now: () => 5 });
    expect(r.status).toBe('ok');
  });
});

describe('cacheState', () => {
  it('classifies by age', () => {
    expect(cacheState({ fetchedAt: 0 }, 1)).toBe('fresh');
    expect(cacheState({ fetchedAt: 0 }, STALE_AFTER_MS)).toBe('stale');
    expect(cacheState({ fetchedAt: 0 }, DISCARD_AFTER_MS)).toBe('expired');
    expect(cacheState({ fetchedAt: 10 }, 5)).toBe('expired');
  });
});
