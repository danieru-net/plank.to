import { TEST_MODE } from './testMode';

/** Fixed place used by the stubbed geocoding and forecast responses. */
export const STUB_PLACE = {
  name: 'Testville',
  admin1: 'Testshire',
  country: 'Testland',
  latitude: 51.51,
  longitude: -0.13,
} as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Fixed Open-Meteo-shaped forecast: cool and rainy (high 14C, low 8C, 70% rain), so the clothing
 * card always suggests the same items. Dates follow the local calendar so "today" is covered.
 */
export function stubForecastBody(): unknown {
  const today = localDate(0);
  const tomorrow = localDate(1);
  const hours = Array.from({ length: 24 }, (_, h) => `${today}T${pad(h)}:00`);
  return {
    latitude: STUB_PLACE.latitude,
    longitude: STUB_PLACE.longitude,
    current: {
      time: `${today}T12:00`,
      temperature_2m: 12,
      apparent_temperature: 10,
      precipitation: 0.4,
      weather_code: 61,
      wind_speed_10m: 14,
      is_day: 1,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 12),
      apparent_temperature: hours.map(() => 10),
      precipitation_probability: hours.map(() => 70),
      weather_code: hours.map(() => 61),
      wind_speed_10m: hours.map(() => 14),
    },
    daily: {
      time: [today, tomorrow],
      weather_code: [61, 3],
      temperature_2m_max: [14, 15],
      temperature_2m_min: [8, 7],
      precipitation_probability_max: [70, 20],
    },
  };
}

export function stubGeocodingBody(): unknown {
  return { results: [{ ...STUB_PLACE }] };
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

/** How the stubbed network behaves: normal, no connection, or the provider answering 503. */
export const NETWORK_MODES = ['ok', 'offline', 'error'] as const;
export type NetworkMode = (typeof NETWORK_MODES)[number];

let networkMode: NetworkMode = 'ok';

export function parseNetworkMode(value: unknown): NetworkMode {
  return NETWORK_MODES.find((m) => m === value) ?? 'ok';
}

/** Test mode only; resets to 'ok' whenever the app process restarts. */
export function setStubNetworkMode(mode: NetworkMode): void {
  networkMode = mode;
}

export function getStubNetworkMode(): NetworkMode {
  return networkMode;
}

/** Answers the two Open-Meteo hosts with fixed data and refuses every other URL. No network. */
export const stubFetch: typeof fetch = async (input) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (networkMode === 'offline') throw new TypeError('Network request failed');
  if (networkMode === 'error') return new Response('unavailable', { status: 503 });
  if (url.startsWith('https://api.open-meteo.com/')) return json(stubForecastBody());
  if (url.startsWith('https://geocoding-api.open-meteo.com/')) return json(stubGeocodingBody());
  throw new TypeError(`Test mode blocks network access: ${url}`);
};

/** `fetch` for weather code paths: the stub in test mode, the real one otherwise. */
export function weatherFetch(): typeof fetch {
  return TEST_MODE ? stubFetch : fetch;
}
