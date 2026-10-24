/**
 * Outfit suggestions. A fixed table maps today's high temperature (Celsius) to a top and a bottom;
 * imperial forecasts are converted first. The wording is informational, not advice.
 */
import type { Forecast } from '@/features/weather/forecast';
import type { TodayWeatherState } from '@/features/weather/weatherDisplay';

export type WeatherFacts = {
  highC: number;
  lowC: number;
  /** Highest chance of precipitation today (0-100), or null when unknown. */
  precipChance: number | null;
  /** The weather code says rain, drizzle, showers, or a thunderstorm. */
  wet: boolean;
  snowy: boolean;
  /** Clear or mostly clear. */
  sunny: boolean;
  /** Highest wind speed today in km/h, or null when unknown. */
  windKmh: number | null;
};

export type Outfit = { id: string; label: string; top: string; bottom: string };

/** Each band covers `minHighC` up to (not including) the next band's `minHighC`. Coldest first. */
export const OUTFITS: readonly (Outfit & { minHighC: number })[] = [
  {
    id: 'very_cold',
    label: 'Very cold (below 5°C)',
    minHighC: -Infinity,
    top: 'Thick sweater under a heavy coat',
    bottom: 'Warm lined trousers',
  },
  {
    id: 'cold',
    label: 'Cold (5 to 14°C)',
    minHighC: 5,
    top: 'Sweater or long-sleeve top with a jacket',
    bottom: 'Trousers or jeans',
  },
  {
    id: 'warm',
    label: 'Warm (15 to 27°C)',
    minHighC: 15,
    top: 'T-shirt',
    bottom: 'Light trousers or shorts',
  },
  {
    id: 'very_hot',
    label: 'Very hot (28°C and above)',
    minHighC: 28,
    top: 'Light, breathable tank top or t-shirt',
    bottom: 'Shorts',
  },
];

/** The outfit for today's high temperature in Celsius. */
export function outfitFor(highC: number): Outfit {
  let match = OUTFITS[0];
  for (const o of OUTFITS) if (highC >= o.minHighC) match = o;
  const { id, label, top, bottom } = match;
  return { id, label, top, bottom };
}

export type Extra = { id: string; label: string };

/** Every wording an extra can have, so tests can check it. */
export const EXTRA_LABELS = {
  rain: 'Raincoat or umbrella',
  rainLight: 'Light rain jacket or umbrella',
  umbrellaMaybe: 'Small umbrella, just in case',
  snowBoots: 'Waterproof boots',
  rainShoes: 'Shoes that keep your feet dry',
  hatGloves: 'Warm hat, scarf and gloves',
  wind: 'Windproof layer',
  layer: 'Extra layer for the cooler morning or evening',
  sun: 'Sunglasses and a sun hat',
} as const;

/**
 * Weather-aware extras on top of the outfit, in a fixed order. Temperatures are Celsius and every
 * threshold is inclusive. Returns an empty list when nothing applies.
 */
export function extrasFor(facts: WeatherFacts): Extra[] {
  const { highC, lowC, precipChance, wet, snowy, sunny, windKmh } = facts;
  const chance = precipChance ?? 0;
  const extras: Extra[] = [];
  const rain = wet || chance >= 50;
  if (rain) {
    const label = highC >= 20 ? EXTRA_LABELS.rainLight : EXTRA_LABELS.rain;
    extras.push({ id: 'rain', label });
  } else if (chance >= 30) {
    extras.push({ id: 'umbrella_maybe', label: EXTRA_LABELS.umbrellaMaybe });
  }
  if (snowy) extras.push({ id: 'boots', label: EXTRA_LABELS.snowBoots });
  else if (wet && highC < 15) extras.push({ id: 'rain_shoes', label: EXTRA_LABELS.rainShoes });
  if (lowC <= 2 || snowy) extras.push({ id: 'hat_gloves', label: EXTRA_LABELS.hatGloves });
  if (windKmh !== null && windKmh >= 30 && highC < 28) {
    extras.push({ id: 'wind', label: EXTRA_LABELS.wind });
  }
  if (highC - lowC >= 10 && highC >= 15) extras.push({ id: 'layer', label: EXTRA_LABELS.layer });
  if (sunny && highC >= 20) extras.push({ id: 'sun', label: EXTRA_LABELS.sun });
  return extras;
}

const WET_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const SUNNY_CODES = new Set([0, 1]);

/** Rounded to 2 decimals so float error cannot push an exact threshold (like 44.6F = 7C) across. */
export const toCelsius = (value: number, units: Forecast['units']): number =>
  units === 'imperial' ? Math.round((((value - 32) * 5) / 9) * 100) / 100 : value;

const KMH_PER_MPH = 1.609344;

/** Highest hourly wind speed for the current local day (else the current wind), in km/h. */
function windKmhFor(forecast: Forecast): number | null {
  const { current, units } = forecast;
  const today = current.time.slice(0, 10);
  const speeds = (forecast.hourly ?? [])
    .filter((h) => h.time.startsWith(today))
    .map((h) => h.windSpeed)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const top = speeds.length > 0 ? Math.max(...speeds) : current.windSpeed;
  if (top === null || top === undefined || !Number.isFinite(top)) return null;
  return units === 'imperial' ? Math.round(top * KMH_PER_MPH * 100) / 100 : top;
}

/**
 * Reduces a forecast to the facts the rules use, for the forecast's current local day. Falls back
 * to the current temperature when daily highs/lows are missing. Returns null when the current
 * temperature is not a finite number.
 */
export function weatherFacts(forecast: Forecast): WeatherFacts | null {
  const { current, units } = forecast;
  if (!Number.isFinite(current.temperature)) return null;
  const day = forecast.daily.find((d) => d.date === current.time.slice(0, 10)) ?? forecast.daily[0];
  const c = (v: number | null | undefined, fallback: number) =>
    toCelsius(v !== null && v !== undefined && Number.isFinite(v) ? v : fallback, units);
  const code = day?.weatherCode ?? current.weatherCode;
  const codes = [current.weatherCode, code];
  return {
    highC: c(day?.temperatureMax, current.temperature),
    lowC: c(day?.temperatureMin, current.temperature),
    precipChance: day?.precipitationProbabilityMax ?? null,
    wet: codes.some((x) => WET_CODES.has(x)),
    snowy: codes.some((x) => SNOW_CODES.has(x)),
    sunny: SUNNY_CODES.has(current.weatherCode),
    windKmh: windKmhFor(forecast),
  };
}

/** The forecast that suggestions may use: current data, or a not-yet-expired cached one. */
export function forecastForSuggestions(state: TodayWeatherState): Forecast | null {
  if (state.status !== 'result') return null;
  const r = state.result;
  if (r.status === 'ok') return r.forecast;
  if (r.status === 'error' && r.forecast && r.freshness !== 'expired') return r.forecast;
  return null;
}
