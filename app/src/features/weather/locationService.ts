import * as Location from 'expo-location';

import { roundCoordinate, toLocationPermission, type LocationPermission } from './weatherSettings';

/** Reads the current foreground permission without prompting. */
export async function getLocationPermission(): Promise<LocationPermission> {
  return toLocationPermission(await Location.getForegroundPermissionsAsync());
}

/**
 * Asks the OS for foreground ("while using") permission. Call only after the user chose
 * location-based weather. Background location is never requested.
 */
export async function requestLocationPermission(): Promise<LocationPermission> {
  return toLocationPermission(await Location.requestForegroundPermissionsAsync());
}

export type ApproximatePosition = { latitude: number; longitude: number };

const POSITION_TIMEOUT_MS = 10_000;

/**
 * One coarse, foreground position fix, rounded immediately. Never prompts: returns null unless
 * permission is already granted. The precise fix is discarded and never stored or logged.
 */
export async function getApproximatePosition(): Promise<ApproximatePosition | null> {
  if ((await getLocationPermission()) !== 'granted') return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), POSITION_TIMEOUT_MS);
      }),
    ]);
    if (!fix) return null;
    return {
      latitude: roundCoordinate(fix.coords.latitude),
      longitude: roundCoordinate(fix.coords.longitude),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
