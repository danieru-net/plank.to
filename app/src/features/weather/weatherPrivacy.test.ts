/**
 * Task 4.9: privacy and provider behavior, with a stubbed network. Nothing here calls a live
 * API. Rules come from docs/location-privacy.md and docs/weather-provider.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ForecastError, WEATHER_ATTRIBUTION, type Forecast } from './forecast';
import {
  DISCARD_AFTER_MS,
  REFRESH_AFTER_MS,
  STALE_AFTER_MS,
  type ForecastStore,
} from './forecastCache';
import { searchPlaces } from './geocoding';
import { describeWeather } from './weatherDisplay';
import { getWeather } from './weatherService';
import type { WeatherSettings } from './weatherSettings';

const apiBody = {
  current: { time: '2026-10-19T12:00', temperature_2m: 8, weather_code: 3 },
};

function recorder(status = 200, body: unknown = apiBody) {
  return jest.fn(async (_url: unknown, _init?: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as jest.Mock & typeof fetch;
}

function memoryStore(initial: Forecast | null = null) {
  let value: unknown = initial;
  const store: ForecastStore = {
    load: jest.fn(async () => value),
    save: jest.fn(async (f: Forecast) => {
      value = f;
    }),
    clear: jest.fn(async () => {
      value = null;
    }),
  };
  return store;
}

const manual = (latitude: number, longitude: number): WeatherSettings => ({
  enabled: true,
  location: { mode: 'manual', label: 'Secret Home Street 12', latitude, longitude },
});

const cachedAt = (fetchedAt: number): Forecast => ({
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
});

const ALLOWED_FORECAST_PARAMS = [
  'current',
  'daily',
  'forecast_days',
  'hourly',
  'latitude',
  'longitude',
  'precipitation_unit',
  'temperature_unit',
  'timezone',
  'wind_speed_unit',
];

describe('no requests while off or without a place', () => {
  it.each([
    ['off, mode off', { enabled: false, location: { mode: 'off' } }],
    [
      'off, a stale manual place still stored',
      {
        enabled: false,
        location: { mode: 'manual', label: 'Oslo', latitude: 59.91, longitude: 10.75 },
      },
    ],
    ['off, device mode', { enabled: false, location: { mode: 'device' } }],
  ] as [string, WeatherSettings][])('%s', async (_name, settings) => {
    const fetchImpl = recorder();
    const store = memoryStore(cachedAt(0));
    const r = await getWeather({
      settings,
      deviceLocation: { latitude: 1, longitude: 2 },
      store,
      fetchImpl,
      force: true,
    });
    expect(r).toEqual({ status: 'unavailable', reason: 'disabled' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(store.load).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('on but no place: no request even when forced; device mode without a fix', async () => {
    const fetchImpl = recorder();
    for (const location of [{ mode: 'off' }, { mode: 'device' }] as const) {
      for (const deviceLocation of [undefined, null]) {
        const r = await getWeather({
          settings: { enabled: true, location },
          deviceLocation,
          store: memoryStore(),
          fetchImpl,
          force: true,
        });
        expect(r).toEqual({ status: 'unavailable', reason: 'no_location' });
      }
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('geocoding makes no request for empty or too-short text', async () => {
    const fetchImpl = recorder();
    for (const text of ['', '  ', 'ab', ' a ']) {
      await expect(searchPlaces(text, fetchImpl)).rejects.toThrow();
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('what is transmitted', () => {
  const places: [number, number][] = [
    [59.912731, 10.746091],
    [-33.868819, 151.209296],
    [0.004999, -0.005001],
    [89.999999, -179.999999],
    [40.7127753, -74.0059728],
  ];

  it.each(places)('forecast request for %f,%f carries only allowed fields', async (lat, lon) => {
    const fetchImpl = recorder();
    await getWeather({
      settings: manual(lat, lon),
      store: memoryStore(),
      fetchImpl,
      force: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [rawUrl, init] = fetchImpl.mock.calls[0];
    const url = new URL(String(rawUrl));
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('api.open-meteo.com');
    expect(url.username + url.password + url.hash).toBe('');
    expect([...url.searchParams.keys()].sort()).toEqual(ALLOWED_FORECAST_PARAMS);
    for (const key of ['latitude', 'longitude']) {
      const v = url.searchParams.get(key) as string;
      expect(v).toMatch(/^-?\d+(\.\d{1,2})?$/);
    }
    expect(url.searchParams.get('timezone')).toBe('auto');
    // Nothing of the label or other user data appears anywhere in the request.
    expect(String(rawUrl)).not.toMatch(/Secret|Home|Street/i);
    // Only credentials and signal are passed: no headers, body, method override, referrer.
    expect(Object.keys(init as object).sort()).toEqual(['credentials', 'signal']);
    expect((init as RequestInit).credentials).toBe('omit');
  });

  it('device positions finer than 2 decimals are rounded before sending', async () => {
    const fetchImpl = recorder();
    await getWeather({
      settings: { enabled: true, location: { mode: 'device' } },
      deviceLocation: { latitude: 51.507351, longitude: -0.127758 },
      store: memoryStore(),
      fetchImpl,
    });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get('latitude')).toBe('51.51');
    expect(url.searchParams.get('longitude')).toBe('-0.13');
  });

  it('the cached forecast holds only rounded coordinates', async () => {
    const store = memoryStore();
    await getWeather({
      settings: manual(59.912731, 10.746091),
      store,
      fetchImpl: recorder(),
      now: () => 5,
    });
    const saved = (store.save as jest.Mock).mock.calls[0][0] as Forecast;
    expect(saved.latitude).toBe(59.91);
    expect(saved.longitude).toBe(10.75);
    expect(JSON.stringify(saved)).not.toMatch(/Secret|Street/);
  });

  it('geocoding request carries only the typed text, count, language, and format', async () => {
    const fetchImpl = recorder(200, { results: [] });
    await searchPlaces('  Oslo  ', fetchImpl);
    const [rawUrl, init] = fetchImpl.mock.calls[0];
    const url = new URL(String(rawUrl));
    expect(url.host).toBe('geocoding-api.open-meteo.com');
    expect([...url.searchParams.keys()].sort()).toEqual(['count', 'format', 'language', 'name']);
    expect(url.searchParams.get('name')).toBe('Oslo');
    expect(Object.keys(init as object).sort()).toEqual(['credentials', 'signal']);
    expect((init as RequestInit).credentials).toBe('omit');
  });
});

describe('attribution', () => {
  it('names Open-Meteo and links over https', () => {
    expect(WEATHER_ATTRIBUTION.text).toBe('Weather data by Open-Meteo.com');
    expect(WEATHER_ATTRIBUTION.url).toBe('https://open-meteo.com/');
  });

  it('is shown on Today whenever weather data is shown', () => {
    const src = readFileSync(join(__dirname, '../today/TodaySummary.tsx'), 'utf8');
    const afterConditions = src.slice(src.indexOf("view.kind === 'conditions'"));
    expect(afterConditions.indexOf('<Attribution />')).toBeGreaterThan(-1);
    expect(afterConditions.indexOf('<Attribution />')).toBeLessThan(
      afterConditions.indexOf(') : ('),
    );
  });

  it('fresh, stale, and failed-refresh-with-cache all show conditions (and so attribution)', () => {
    const now = 10 * 60 * 60 * 1000;
    const f = cachedAt(now - STALE_AFTER_MS - 1);
    const views = [
      describeWeather(
        { status: 'result', result: { status: 'ok', forecast: cachedAt(now), freshness: 'fresh' } },
        now,
      ),
      describeWeather(
        { status: 'result', result: { status: 'ok', forecast: f, freshness: 'stale' } },
        now,
      ),
      describeWeather(
        {
          status: 'result',
          result: {
            status: 'error',
            error: new ForecastError('rate_limited', 'x'),
            forecast: f,
            freshness: 'stale',
          },
        },
        now,
      ),
    ];
    for (const v of views) expect(v.kind).toBe('conditions');
  });
});

describe('cache behavior', () => {
  const settings = manual(59.91, 10.75);

  it('no request at 29 minutes, a request at 30 minutes', async () => {
    const t0 = 1_000_000;
    const young = recorder();
    await getWeather({
      settings,
      store: memoryStore(cachedAt(t0)),
      fetchImpl: young,
      now: () => t0 + REFRESH_AFTER_MS - 1,
    });
    expect(young).not.toHaveBeenCalled();
    const old = recorder();
    await getWeather({
      settings,
      store: memoryStore(cachedAt(t0)),
      fetchImpl: old,
      now: () => t0 + REFRESH_AFTER_MS,
    });
    expect(old).toHaveBeenCalledTimes(1);
  });

  it('keeps one forecast: a new fetch replaces the old one', async () => {
    const store = memoryStore(cachedAt(0));
    await getWeather({ settings, store, fetchImpl: recorder(), now: () => REFRESH_AFTER_MS });
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(((await store.load()) as Forecast).fetchedAt).toBe(REFRESH_AFTER_MS);
  });

  it('a clock moved backwards does not keep a cache alive', async () => {
    const fetchImpl = recorder();
    await getWeather({
      settings,
      store: memoryStore(cachedAt(1_000_000)),
      fetchImpl,
      now: () => 500,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('a failing store never blocks the forecast or throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const store: ForecastStore = {
      load: jest.fn().mockRejectedValue(new Error('db')),
      save: jest.fn().mockRejectedValue(new Error('db')),
      clear: jest.fn().mockRejectedValue(new Error('db')),
    };
    const r = await getWeather({ settings, store, fetchImpl: recorder(), now: () => 5 });
    expect(r.status).toBe('ok');
    spy.mockRestore();
  });
});

describe('rate limits and provider errors', () => {
  const settings = manual(59.91, 10.75);

  it.each([
    [429, 'rate_limited'],
    [400, 'invalid_location'],
    [500, 'provider'],
    [503, 'provider'],
  ])('HTTP %i with no cache: one request, no retry, kind %s', async (status, kind) => {
    const fetchImpl = recorder(status, { error: true });
    const r = await getWeather({ settings, store: memoryStore(), fetchImpl, now: () => 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ status: 'error', forecast: null, freshness: null });
    if (r.status === 'error') expect(r.error.kind).toBe(kind);
  });

  it('keeps and does not overwrite the cache when the provider fails', async () => {
    const store = memoryStore(cachedAt(0));
    const r = await getWeather({
      settings,
      store,
      fetchImpl: recorder(429, {}),
      now: () => STALE_AFTER_MS,
    });
    expect(store.save).not.toHaveBeenCalled();
    expect(r).toMatchObject({ status: 'error', freshness: 'stale' });
  });

  it('a cache just under 24 hours old is still offered as stale; at 24 hours it is dropped', async () => {
    const r1 = await getWeather({
      settings,
      store: memoryStore(cachedAt(0)),
      fetchImpl: recorder(503, {}),
      now: () => DISCARD_AFTER_MS - 1,
    });
    expect(r1).toMatchObject({ status: 'error', freshness: 'stale' });
    const r2 = await getWeather({
      settings,
      store: memoryStore(cachedAt(0)),
      fetchImpl: recorder(503, {}),
      now: () => DISCARD_AFTER_MS,
    });
    expect(r2).toMatchObject({ status: 'error', forecast: null });
  });

  it('offline, malformed, and thrown non-Error failures become readable errors', async () => {
    const offline = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const r1 = await getWeather({ settings, store: memoryStore(), fetchImpl: offline });
    expect(r1).toMatchObject({ status: 'error' });
    if (r1.status === 'error') expect(r1.error.kind).toBe('network');
    const junk = recorder(200, { hello: 'world' });
    const r2 = await getWeather({ settings, store: memoryStore(), fetchImpl: junk });
    if (r2.status === 'error') expect(r2.error.kind).toBe('invalid_response');
    else throw new Error('expected an error');
    const html = recorder(200, '<html>blocked</html>');
    const r3 = await getWeather({ settings, store: memoryStore(), fetchImpl: html });
    expect(r3.status).toBe('error');
  });

  it('error views never block the task list and offer retry, not auto-retry', () => {
    const view = describeWeather(
      {
        status: 'result',
        result: {
          status: 'error',
          error: new ForecastError('rate_limited', 'x'),
          forecast: null,
          freshness: null,
        },
      },
      0,
    );
    expect(view).toMatchObject({ kind: 'message', action: 'retry' });
  });
});

describe('geocoding failures', () => {
  it('HTTP 429 and network errors are readable errors with a single request', async () => {
    const limited = recorder(429, {});
    await expect(searchPlaces('Oslo', limited)).rejects.toThrow(/not available|search/i);
    expect(limited).toHaveBeenCalledTimes(1);
    const offline = jest.fn().mockRejectedValue(new TypeError('offline'));
    await expect(searchPlaces('Oslo', offline)).rejects.toThrow(/connection/i);
  });

  it('a malformed body yields no results instead of throwing', async () => {
    await expect(searchPlaces('Oslo', recorder(200, null))).resolves.toEqual([]);
  });
});
