/**
 * Weather and location settings: pure helpers, copy, and validation. See
 * docs/location-privacy.md for the design these follow. Nothing here touches the network or the
 * device; those live in geocoding.ts and locationService.ts.
 */
import type { WeatherLocationMode, WeatherLocationSettingsRow } from '@/db/types';

export type WeatherLocation =
  | { mode: 'off' }
  | { mode: 'device' }
  | { mode: 'manual'; label: string; latitude: number; longitude: number };

export type WeatherSettings = {
  /** The user turned weather on. Off by default; nothing is sent while false. */
  enabled: boolean;
  location: WeatherLocation;
};

export const defaultWeatherSettings: WeatherSettings = {
  enabled: false,
  location: { mode: 'off' },
};

/** Coordinates are rounded to 2 decimals (about 1 km) before they are stored or sent. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * Builds settings from the stored row and the `weather.enabled` preference. A stored location
 * only counts while weather is enabled, and an incomplete manual row falls back to "none".
 */
export function parseWeatherSettings(
  row: Pick<
    WeatherLocationSettingsRow,
    'mode' | 'manual_label' | 'manual_latitude' | 'manual_longitude'
  > | null,
  enabledPref: unknown,
): WeatherSettings {
  if (enabledPref !== true || !row) return defaultWeatherSettings;
  const mode: WeatherLocationMode = row.mode;
  if (mode === 'device') return { enabled: true, location: { mode: 'device' } };
  if (
    mode === 'manual' &&
    row.manual_label &&
    isValidCoordinate(row.manual_latitude, row.manual_longitude)
  ) {
    return {
      enabled: true,
      location: {
        mode: 'manual',
        label: row.manual_label,
        latitude: row.manual_latitude as number,
        longitude: row.manual_longitude as number,
      },
    };
  }
  return { enabled: true, location: { mode: 'off' } };
}

/** What the app knows about location permission, independent of the platform API. */
export type LocationPermission = 'undetermined' | 'granted' | 'denied';

export type LocationPermissionResponseLike = {
  status: string;
  granted: boolean;
};

export function toLocationPermission(response: LocationPermissionResponseLike): LocationPermission {
  if (response.granted || response.status === 'granted') return 'granted';
  if (response.status === 'denied') return 'denied';
  return 'undetermined';
}

export const minSearchLength = 3;

/** Trimmed search text, or null when too short to search. */
export function normalizeSearchText(text: string): string | null {
  const trimmed = text.trim();
  return trimmed.length >= minSearchLength ? trimmed : null;
}

export const weatherDisclosure =
  "Weather is optional and off. If you turn it on, Plank asks Open-Meteo for the forecast near you. It sends only an approximate location (rounded to about 1 km) and which weather details to return. It never sends your tasks, routines, or settings. Open-Meteo can see your device's IP address, like any website you visit. Plank does not run its own server and cannot see your location. You can search for a city or postcode instead of sharing your device location, or turn weather off at any time, which deletes the saved location from this device.";

export const deviceLocationExplanation =
  'Plank would use your device location to find a forecast near you. It is approximate, only checked while the app is open, and never tracked in the background. You can search for a place instead.';

export const locationPermissionText: Record<LocationPermission, string> = {
  undetermined: 'Plank has not asked for location permission.',
  granted: 'Location is allowed while Plank is open.',
  denied:
    'Location is blocked in your device settings. Search for a place instead, or allow it in your device settings if you want to use device location.',
};
