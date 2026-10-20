/**
 * Pure view model for the weather card on Today (task 4.5): maps a weather result to calm,
 * plain copy. Weather problems are informational and never block the task agenda.
 */
import type { Forecast, ForecastErrorKind } from './forecast';
import type { WeatherResult } from './weatherService';

/** What the Today hook knows; `result` comes from `getWeather`. */
export type TodayWeatherState =
  | { status: 'loading' }
  | { status: 'result'; result: WeatherResult }
  /** Device mode, but location permission is not granted. */
  | { status: 'permission'; permission: 'denied' | 'undetermined' }
  | { status: 'position_failed' }
  | { status: 'settings_failed' };

export type WeatherAction = 'retry' | 'settings' | 'device_settings';

export type WeatherView =
  | { kind: 'loading' }
  | { kind: 'off' }
  | { kind: 'message'; title: string; body: string; action: WeatherAction | null }
  | {
      kind: 'conditions';
      icon: string;
      /** The current temperature, such as "18°C", shown large on its own. */
      temperature: string;
      /** The plain-language conditions, such as "Partly cloudy". */
      condition: string;
      summary: string;
      details: string[];
      /** Stale or error note shown with the data; null when the data is current. */
      notice: string | null;
      action: WeatherAction | null;
      label: string;
    };

type Condition = { label: string; day: string; night: string };

const clear: Condition = { label: 'Clear', day: '☀️', night: '🌙' };
const conditions: [number[], Condition][] = [
  [[0], clear],
  [[1], { label: 'Mostly clear', day: '🌤️', night: '🌙' }],
  [[2], { label: 'Partly cloudy', day: '⛅', night: '☁️' }],
  [[3], { label: 'Overcast', day: '☁️', night: '☁️' }],
  [[45, 48], { label: 'Fog', day: '🌫️', night: '🌫️' }],
  [[51, 53, 55, 56, 57], { label: 'Drizzle', day: '🌦️', night: '🌧️' }],
  [[61, 63, 65, 66, 67], { label: 'Rain', day: '🌧️', night: '🌧️' }],
  [[71, 73, 75, 77], { label: 'Snow', day: '🌨️', night: '🌨️' }],
  [[80, 81, 82], { label: 'Rain showers', day: '🌦️', night: '🌧️' }],
  [[85, 86], { label: 'Snow showers', day: '🌨️', night: '🌨️' }],
  [[95, 96, 99], { label: 'Thunderstorms', day: '⛈️', night: '⛈️' }],
];

/** Plain-language label and icon for a WMO weather code. */
export function describeWeatherCode(
  code: number,
  isDay: boolean | null,
): { label: string; icon: string } {
  const found = conditions.find(([codes]) => codes.includes(code))?.[1];
  if (!found) return { label: 'Conditions unavailable', icon: '🌡️' };
  return { label: found.label, icon: isDay === false ? found.night : found.day };
}

export function formatTemperature(value: number, units: Forecast['units']): string {
  const rounded = Math.round(value);
  return `${Object.is(rounded, -0) ? 0 : rounded}°${units === 'imperial' ? 'F' : 'C'}`;
}

/** "5 minutes", "3 hours", "2 days" for an age in ms. */
export function formatAge(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

const errorCopy: Record<ForecastErrorKind, { title: string; body: string }> = {
  network: {
    title: 'No connection',
    body: 'Weather needs an internet connection. Your tasks are not affected.',
  },
  rate_limited: {
    title: 'Weather is busy',
    body: 'The weather service asked for a pause. Try again later. Your tasks are not affected.',
  },
  provider: {
    title: 'Weather is unavailable',
    body: 'The weather service could not be reached. Your tasks are not affected.',
  },
  invalid_response: {
    title: 'Weather is unavailable',
    body: 'The weather service sent data Plank could not read. Your tasks are not affected.',
  },
  invalid_location: {
    title: 'Weather location problem',
    body: 'The saved location could not be used. Choose a place again in Settings.',
  },
};

function conditionsView(
  forecast: Forecast,
  now: number,
  notice: string | null,
  action: WeatherAction | null,
): WeatherView {
  const { current, units } = forecast;
  const { label, icon } = describeWeatherCode(current.weatherCode, current.isDay);
  const temperature = formatTemperature(current.temperature, units);
  const details: string[] = [];
  if (current.apparentTemperature !== null) {
    details.push(`Feels like ${formatTemperature(current.apparentTemperature, units)}`);
  }
  const today = forecast.daily[0];
  if (today && today.temperatureMax !== null && today.temperatureMin !== null) {
    details.push(
      `High ${formatTemperature(today.temperatureMax, units)}, low ${formatTemperature(today.temperatureMin, units)}`,
    );
  }
  if (today && today.precipitationProbabilityMax !== null) {
    details.push(`${Math.round(today.precipitationProbabilityMax)}% chance of precipitation`);
  }
  const age = formatAge(now - forecast.fetchedAt);
  const stale = notice !== null;
  const spoken = [`${label}, ${temperature}`, ...details];
  if (stale) spoken.push(notice, `Updated ${age} ago`);
  return {
    kind: 'conditions',
    icon,
    temperature,
    condition: label,
    summary: `${label}, ${temperature}`,
    details,
    notice: stale ? `${notice} Last updated ${age} ago.` : null,
    action,
    label: `Weather: ${spoken.join('. ')}.`,
  };
}

export function describeWeather(state: TodayWeatherState, now: number): WeatherView {
  switch (state.status) {
    case 'loading':
      return { kind: 'loading' };
    case 'settings_failed':
      return {
        kind: 'message',
        title: 'Weather settings unavailable',
        body: 'Plank could not read your weather settings. Your tasks are not affected.',
        action: 'retry',
      };
    case 'permission':
      return {
        kind: 'message',
        title: 'Location is not allowed',
        body:
          state.permission === 'denied'
            ? 'Plank cannot use your device location. Search for a place in Settings, or allow location in your device settings.'
            : 'Plank has not been given location access. Search for a place in Settings, or allow device location there.',
        action: state.permission === 'denied' ? 'device_settings' : 'settings',
      };
    case 'position_failed':
      return {
        kind: 'message',
        title: 'Location not found',
        body: 'Plank could not get your approximate location just now. Try again, or search for a place in Settings.',
        action: 'retry',
      };
    case 'result':
      break;
  }
  const result = state.result;
  if (result.status === 'unavailable') {
    if (result.reason === 'disabled') return { kind: 'off' };
    return {
      kind: 'message',
      title: 'Choose a place',
      body: 'Weather is on, but no place is chosen. Pick one in Settings.',
      action: 'settings',
    };
  }
  if (result.status === 'ok') {
    return conditionsView(
      result.forecast,
      now,
      result.freshness === 'stale' ? 'This forecast may be out of date.' : null,
      null,
    );
  }
  const copy = errorCopy[result.error.kind];
  if (result.forecast && result.freshness !== 'expired') {
    return conditionsView(
      result.forecast,
      now,
      `Could not refresh: ${copy.title.toLowerCase()}.`,
      result.error.kind === 'invalid_location' ? 'settings' : 'retry',
    );
  }
  return {
    kind: 'message',
    title: copy.title,
    body: copy.body,
    action: result.error.kind === 'invalid_location' ? 'settings' : 'retry',
  };
}
