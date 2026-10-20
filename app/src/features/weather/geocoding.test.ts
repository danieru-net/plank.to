import { buildGeocodingUrl, parseGeocodingResponse, searchPlaces } from './geocoding';

const okResponse = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;

describe('buildGeocodingUrl', () => {
  it('sends only the search text, count, language, and format', () => {
    const url = new URL(buildGeocodingUrl('São Paulo'));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect([...url.searchParams.keys()].sort()).toEqual(['count', 'format', 'language', 'name']);
    expect(url.searchParams.get('name')).toBe('São Paulo');
  });
});

describe('parseGeocodingResponse', () => {
  it('rounds coordinates, builds labels, and skips malformed entries', () => {
    const out = parseGeocodingResponse({
      results: [
        {
          name: 'Oslo',
          admin1: 'Oslo',
          country: 'Norway',
          latitude: 59.91273,
          longitude: 10.74609,
        },
        { name: '', latitude: 1, longitude: 1 },
        { name: 'Bad', latitude: 200, longitude: 1 },
        null,
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ label: 'Oslo, Norway', latitude: 59.91, longitude: 10.75 });
  });
  it('returns an empty list when there are no results', () => {
    expect(parseGeocodingResponse({})).toEqual([]);
    expect(parseGeocodingResponse(null)).toEqual([]);
  });
});

describe('searchPlaces', () => {
  it('does not call the network for short text', async () => {
    const fetchImpl = jest.fn();
    await expect(searchPlaces('Os', fetchImpl as never)).rejects.toThrow(/3 characters/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('calls Open-Meteo without headers or cookies', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(okResponse({ results: [] }));
    expect(await searchPlaces('Oslo', fetchImpl as never)).toEqual([]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('geocoding-api.open-meteo.com');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toBeUndefined();
  });

  it('turns HTTP and network failures into readable errors', async () => {
    const bad = jest.fn().mockResolvedValue({ ok: false });
    await expect(searchPlaces('Oslo', bad as never)).rejects.toThrow(/not available/);
    const down = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(searchPlaces('Oslo', down as never)).rejects.toThrow(/connection/);
  });
});
