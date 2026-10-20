import { buildForecastUrl, fetchForecast, parseForecastResponse } from './forecast';

const req = { latitude: 59.91, longitude: 10.75, units: 'metric' as const, fetchedAt: 1000 };

const body = () => ({
  current: {
    time: '2026-10-19T12:00',
    temperature_2m: 8.5,
    apparent_temperature: 6,
    precipitation: 0,
    weather_code: 3,
    wind_speed_10m: 12,
    is_day: 1,
  },
  hourly: {
    time: ['2026-10-19T12:00', '', '2026-10-19T14:00'],
    temperature_2m: [8, 9, null],
    precipitation_probability: [10, 20, 30],
  },
  daily: {
    time: ['2026-10-19'],
    weather_code: [3],
    temperature_2m_max: [10],
    temperature_2m_min: [4],
    precipitation_probability_max: [40],
  },
});

const respond = (status: number, json: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => json }) as unknown as Response;

describe('buildForecastUrl', () => {
  it('sends only rounded coordinates, variable names, and units', () => {
    const url = new URL(buildForecastUrl(59.91273, 10.74609));
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('59.91');
    expect(url.searchParams.get('longitude')).toBe('10.75');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect([...url.searchParams.keys()].sort()).toEqual([
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
    ]);
  });

  it('uses imperial units when asked', () => {
    const url = new URL(buildForecastUrl(1, 2, 'imperial'));
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
  });
});

describe('parseForecastResponse', () => {
  it('normalizes a response, skipping rows without a time and nulling gaps', () => {
    const f = parseForecastResponse(body(), req);
    expect(f.current).toMatchObject({ temperature: 8.5, weatherCode: 3, isDay: true });
    expect(f.hourly).toHaveLength(2);
    expect(f.hourly[1]).toMatchObject({ temperature: null, precipitationProbability: 30 });
    expect(f.hourly[0].weatherCode).toBeNull();
    expect(f.daily[0]).toMatchObject({ temperatureMax: 10, temperatureMin: 4 });
    expect(f.fetchedAt).toBe(1000);
  });

  it('tolerates missing hourly and daily sections', () => {
    const b = body() as Record<string, unknown>;
    delete b.hourly;
    delete b.daily;
    const f = parseForecastResponse(b, req);
    expect(f.hourly).toEqual([]);
    expect(f.daily).toEqual([]);
  });

  it.each([null, 'x', [], { error: true, reason: 'bad' }, { current: {} }])(
    'rejects invalid body %p',
    (b) => {
      expect(() => parseForecastResponse(b, req)).toThrow(/expected form/);
    },
  );

  it('rejects a current temperature that is not a number', () => {
    const b = body();
    (b.current as Record<string, unknown>).temperature_2m = '8';
    expect(() => parseForecastResponse(b, req)).toThrow();
  });
});

describe('fetchForecast', () => {
  const place = { latitude: 59.91, longitude: 10.75 };

  it('makes one request with no headers and normalizes the result', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(respond(200, body()));
    const f = await fetchForecast(place, { fetchImpl, now: () => 5 });
    expect(f.fetchedAt).toBe(5);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0][1];
    expect(init.credentials).toBe('omit');
    expect(init.headers).toBeUndefined();
  });

  it('does not call the network for invalid coordinates', async () => {
    const fetchImpl = jest.fn();
    await expect(
      fetchForecast({ latitude: 91, longitude: 0 }, { fetchImpl }),
    ).rejects.toMatchObject({
      kind: 'invalid_location',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [429, 'rate_limited'],
    [400, 'invalid_location'],
    [500, 'provider'],
    [503, 'provider'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const fetchImpl = jest.fn().mockResolvedValue(respond(status, { error: true }));
    await expect(fetchForecast(place, { fetchImpl })).rejects.toMatchObject({ kind });
  });

  it('maps a thrown fetch to a network error', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('offline'));
    await expect(fetchForecast(place, { fetchImpl })).rejects.toMatchObject({ kind: 'network' });
  });

  it('maps unparseable JSON to an invalid response', async () => {
    const bad = { ok: true, status: 200, json: async () => Promise.reject(new Error('x')) };
    const fetchImpl = jest.fn().mockResolvedValue(bad);
    await expect(fetchForecast(place, { fetchImpl })).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('treats a 200 response with an error flag, or a non-object body, as invalid', async () => {
    for (const json of [{ error: true, reason: 'x' }, null, [], 'text']) {
      const fetchImpl = jest.fn().mockResolvedValue(respond(200, json));
      await expect(fetchForecast(place, { fetchImpl })).rejects.toMatchObject({
        kind: 'invalid_response',
      });
    }
  });

  it('rejects a response missing the weather code or time', async () => {
    for (const drop of ['weather_code', 'time'] as const) {
      const b = body();
      delete (b.current as Record<string, unknown>)[drop];
      const fetchImpl = jest.fn().mockResolvedValue(respond(200, b));
      await expect(fetchForecast(place, { fetchImpl })).rejects.toMatchObject({
        kind: 'invalid_response',
      });
    }
  });

  it('gives up after 10 seconds with a network error and does not retry', async () => {
    jest.useFakeTimers();
    try {
      const fetchImpl = jest.fn(
        (_url: unknown, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const result = fetchForecast(place, { fetchImpl: fetchImpl as unknown as typeof fetch });
      const assertion = expect(result).rejects.toMatchObject({ kind: 'network' });
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
