/**
 * Open-Meteo forecast adapter (task 4.4). Builds the request, validates and normalizes the
 * response, and maps failures to plain errors. Follows docs/weather-provider.md and
 * docs/location-privacy.md: direct call, no key, no custom headers or cookies, coordinates
 * rounded to 2 decimals, weather variable names only. The caller must only use this while
 * weather is enabled and a location is set (see weatherService.ts).
 */
import { weatherFetch } from '@/testing/stubFetch';
import { isValidCoordinate, roundCoordinate } from './weatherSettings';

export const WEATHER_ATTRIBUTION = {
  text: 'Weather data by Open-Meteo.com',
  url: 'https://open-meteo.com/',
} as const;

export type WeatherUnits = 'metric' | 'imperial';

export type CurrentConditions = {
  /** Local time at the place, `YYYY-MM-DDTHH:mm`. */
  time: string;
  temperature: number;
  apparentTemperature: number | null;
  precipitation: number | null;
  /** WMO weather code. */
  weatherCode: number;
  windSpeed: number | null;
  isDay: boolean | null;
};

export type HourlyPoint = {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
};

export type DailyPoint = {
  /** `YYYY-MM-DD` at the place. */
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbabilityMax: number | null;
};

export type Forecast = {
  latitude: number;
  longitude: number;
  units: WeatherUnits;
  /** Epoch ms when the app fetched this. */
  fetchedAt: number;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

export type ForecastErrorKind =
  'invalid_location' | 'network' | 'rate_limited' | 'provider' | 'invalid_response';

export class ForecastError extends Error {
  readonly kind: ForecastErrorKind;
  constructor(kind: ForecastErrorKind, message: string) {
    super(message);
    this.name = 'ForecastError';
    this.kind = kind;
  }
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;
const FORECAST_DAYS = 2;
const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'is_day',
];
const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
];
const DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
];

/** Request URL. Coordinates are rounded again here so nothing finer can ever be sent. */
export function buildForecastUrl(
  latitude: number,
  longitude: number,
  units: WeatherUnits = 'metric',
): string {
  const params = new URLSearchParams({
    latitude: String(roundCoordinate(latitude)),
    longitude: String(roundCoordinate(longitude)),
    current: CURRENT_VARS.join(','),
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'kmh',
    precipitation_unit: units === 'imperial' ? 'inch' : 'mm',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

const invalid = () =>
  new ForecastError('invalid_response', 'The weather data was not in the expected form.');

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function column(table: Record<string, unknown>, key: string, length: number): unknown[] {
  const col = table[key];
  return Array.isArray(col) && col.length >= length ? col : new Array(length).fill(null);
}

/**
 * Validates a forecast response and normalizes it. Throws `ForecastError('invalid_response')`
 * when the required current temperature, weather code, or time is missing. Missing optional
 * values become null; hourly and daily rows without a valid time are skipped.
 */
export function parseForecastResponse(
  body: unknown,
  request: { latitude: number; longitude: number; units: WeatherUnits; fetchedAt: number },
): Forecast {
  if (!isRecord(body) || body.error === true) throw invalid();
  const cur = body.current;
  if (!isRecord(cur)) throw invalid();
  const time = str(cur.time);
  const temperature = num(cur.temperature_2m);
  const weatherCode = num(cur.weather_code);
  if (!time || temperature === null || weatherCode === null) throw invalid();

  const hourly: HourlyPoint[] = [];
  if (isRecord(body.hourly) && Array.isArray(body.hourly.time)) {
    const t = body.hourly.time;
    const cols = {
      temp: column(body.hourly, 'temperature_2m', t.length),
      app: column(body.hourly, 'apparent_temperature', t.length),
      prob: column(body.hourly, 'precipitation_probability', t.length),
      code: column(body.hourly, 'weather_code', t.length),
      wind: column(body.hourly, 'wind_speed_10m', t.length),
    };
    t.forEach((value, i) => {
      const at = str(value);
      if (!at) return;
      hourly.push({
        time: at,
        temperature: num(cols.temp[i]),
        apparentTemperature: num(cols.app[i]),
        precipitationProbability: num(cols.prob[i]),
        weatherCode: num(cols.code[i]),
        windSpeed: num(cols.wind[i]),
      });
    });
  }

  const daily: DailyPoint[] = [];
  if (isRecord(body.daily) && Array.isArray(body.daily.time)) {
    const t = body.daily.time;
    const cols = {
      code: column(body.daily, 'weather_code', t.length),
      max: column(body.daily, 'temperature_2m_max', t.length),
      min: column(body.daily, 'temperature_2m_min', t.length),
      prob: column(body.daily, 'precipitation_probability_max', t.length),
    };
    t.forEach((value, i) => {
      const date = str(value);
      if (!date) return;
      daily.push({
        date,
        weatherCode: num(cols.code[i]),
        temperatureMax: num(cols.max[i]),
        temperatureMin: num(cols.min[i]),
        precipitationProbabilityMax: num(cols.prob[i]),
      });
    });
  }

  return {
    latitude: roundCoordinate(request.latitude),
    longitude: roundCoordinate(request.longitude),
    units: request.units,
    fetchedAt: request.fetchedAt,
    current: {
      time,
      temperature,
      apparentTemperature: num(cur.apparent_temperature),
      precipitation: num(cur.precipitation),
      weatherCode,
      windSpeed: num(cur.wind_speed_10m),
      isDay: cur.is_day === 1 ? true : cur.is_day === 0 ? false : null,
    },
    hourly,
    daily,
  };
}

/** Maps an HTTP status to an error. Open-Meteo returns 400 with `{error:true}` for bad input. */
function statusError(status: number): ForecastError {
  if (status === 429) {
    return new ForecastError('rate_limited', 'The weather service is busy. Try again later.');
  }
  if (status === 400) {
    return new ForecastError(
      'invalid_location',
      'The weather service did not accept this location.',
    );
  }
  return new ForecastError('provider', 'The weather service is not available right now.');
}

/**
 * Fetches and normalizes a forecast. Makes exactly one request, with no retries, headers,
 * cookies, or identifiers, and gives up after 10 seconds.
 */
export async function fetchForecast(
  place: { latitude: number; longitude: number },
  options: { units?: WeatherUnits; fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<Forecast> {
  const { units = 'metric', fetchImpl = weatherFetch(), now = Date.now } = options;
  if (!isValidCoordinate(place.latitude, place.longitude)) {
    throw new ForecastError('invalid_location', 'This location is not valid.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetchImpl(buildForecastUrl(place.latitude, place.longitude, units), {
        credentials: 'omit',
        signal: controller.signal,
      });
    } catch {
      throw new ForecastError(
        'network',
        'Could not reach the weather service. Check your connection.',
      );
    }
    if (!response.ok) throw statusError(response.status);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw invalid();
    }
    return parseForecastResponse(body, { ...place, units, fetchedAt: now() });
  } finally {
    clearTimeout(timer);
  }
}
