import { weatherFetch } from '@/testing/stubFetch';
import { isValidCoordinate, roundCoordinate, normalizeSearchText } from './weatherSettings';

export type PlaceResult = {
  /** Stable key for lists: the rounded coordinates plus name. */
  key: string;
  /** Name with region and country, shown so the user knows what is used. */
  label: string;
  latitude: number;
  longitude: number;
};

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const RESULT_COUNT = 5;
const TIMEOUT_MS = 10_000;

/** Request URL. Sends only the search text, count, language, and format (docs/location-privacy.md). */
export function buildGeocodingUrl(text: string, language = 'en'): string {
  const params = new URLSearchParams({
    name: text,
    count: String(RESULT_COUNT),
    language,
    format: 'json',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/** Picks the first usable results from a geocoding response; ignores malformed entries. */
export function parseGeocodingResponse(body: unknown): PlaceResult[] {
  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const out: PlaceResult[] = [];
  for (const r of results) {
    const item = r as Record<string, unknown> | null;
    if (!item || typeof item.name !== 'string' || !item.name.trim()) continue;
    if (!isValidCoordinate(item.latitude, item.longitude)) continue;
    const latitude = roundCoordinate(item.latitude as number);
    const longitude = roundCoordinate(item.longitude as number);
    const parts = [item.name, item.admin1, item.country]
      .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
      .map((p) => p.trim());
    const label = parts.filter((p, i) => parts.indexOf(p) === i).join(', ');
    out.push({ key: `${label}|${latitude}|${longitude}`, label, latitude, longitude });
  }
  return out.slice(0, RESULT_COUNT);
}

export class GeocodingError extends Error {}

/**
 * Searches Open-Meteo geocoding. Call only after the user enabled weather and acted on the
 * search. No headers, cookies, or identifiers are added.
 */
export async function searchPlaces(
  text: string,
  fetchImpl: typeof fetch = weatherFetch(),
): Promise<PlaceResult[]> {
  const query = normalizeSearchText(text);
  if (!query) throw new GeocodingError('Enter at least 3 characters to search.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(buildGeocodingUrl(query), {
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!response.ok) throw new GeocodingError('The place search is not available right now.');
    return parseGeocodingResponse(await response.json());
  } catch (e) {
    if (e instanceof GeocodingError) throw e;
    throw new GeocodingError('Could not search for places. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}
