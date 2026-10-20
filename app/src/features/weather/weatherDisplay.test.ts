import { ForecastError, type Forecast } from './forecast';
import {
  describeWeather,
  describeWeatherCode,
  formatAge,
  formatTemperature,
} from './weatherDisplay';

const NOW = 1_000_000_000_000;
const forecast = (over: Partial<Forecast> = {}): Forecast => ({
  latitude: 1,
  longitude: 2,
  units: 'metric',
  fetchedAt: NOW - 5 * 60_000,
  current: {
    time: '2026-10-19T10:00',
    temperature: 17.6,
    apparentTemperature: 15.2,
    precipitation: 0,
    weatherCode: 2,
    windSpeed: 5,
    isDay: true,
  },
  hourly: [],
  daily: [
    {
      date: '2026-10-19',
      weatherCode: 2,
      temperatureMax: 20.4,
      temperatureMin: 9.5,
      precipitationProbabilityMax: 30,
    },
  ],
  ...over,
});

describe('weather display helpers', () => {
  it('maps codes and day/night', () => {
    expect(describeWeatherCode(0, true)).toEqual({ label: 'Clear', icon: '☀️' });
    expect(describeWeatherCode(0, false).icon).toBe('🌙');
    expect(describeWeatherCode(95, null).label).toBe('Thunderstorms');
    expect(describeWeatherCode(1234, null).label).toBe('Conditions unavailable');
  });
  it('formats temperature and age', () => {
    expect(formatTemperature(17.6, 'metric')).toBe('18°C');
    expect(formatTemperature(-0.2, 'imperial')).toBe('0°F');
    expect(formatAge(30_000)).toBe('less than a minute');
    expect(formatAge(60_000)).toBe('1 minute');
    expect(formatAge(3 * 3_600_000)).toBe('3 hours');
    expect(formatAge(50 * 3_600_000)).toBe('2 days');
  });
});

describe('describeWeather', () => {
  it('loading', () => {
    expect(describeWeather({ status: 'loading' }, NOW).kind).toBe('loading');
  });
  it('off when disabled', () => {
    const v = describeWeather(
      { status: 'result', result: { status: 'unavailable', reason: 'disabled' } },
      NOW,
    );
    expect(v.kind).toBe('off');
  });
  it('asks for a place when none is chosen', () => {
    const v = describeWeather(
      { status: 'result', result: { status: 'unavailable', reason: 'no_location' } },
      NOW,
    );
    expect(v).toMatchObject({ kind: 'message', action: 'settings' });
  });
  it('shows current conditions without a notice', () => {
    const v = describeWeather(
      { status: 'result', result: { status: 'ok', forecast: forecast(), freshness: 'fresh' } },
      NOW,
    );
    expect(v).toMatchObject({
      kind: 'conditions',
      temperature: '18°C',
      condition: 'Partly cloudy',
      summary: 'Partly cloudy, 18°C',
      notice: null,
      action: null,
    });
    if (v.kind === 'conditions') {
      expect(v.details).toEqual([
        'Feels like 15°C',
        'High 20°C, low 10°C',
        '30% chance of precipitation',
      ]);
    }
  });
  it('marks stale data with its age', () => {
    const v = describeWeather(
      {
        status: 'result',
        result: {
          status: 'ok',
          forecast: forecast({ fetchedAt: NOW - 4 * 3_600_000 }),
          freshness: 'stale',
        },
      },
      NOW,
    );
    expect(v).toMatchObject({ kind: 'conditions' });
    if (v.kind === 'conditions') expect(v.notice).toContain('4 hours ago');
  });
  it('shows cached data with a retry on a network error', () => {
    const v = describeWeather(
      {
        status: 'result',
        result: {
          status: 'error',
          error: new ForecastError('network', 'x'),
          forecast: forecast(),
          freshness: 'fresh',
        },
      },
      NOW,
    );
    expect(v).toMatchObject({ kind: 'conditions', action: 'retry' });
    if (v.kind === 'conditions') expect(v.notice).toContain('no connection');
  });
  it('shows a message when there is no cached data', () => {
    const net = describeWeather(
      {
        status: 'result',
        result: {
          status: 'error',
          error: new ForecastError('network', 'x'),
          forecast: null,
          freshness: null,
        },
      },
      NOW,
    );
    expect(net).toMatchObject({ kind: 'message', title: 'No connection', action: 'retry' });
    const prov = describeWeather(
      {
        status: 'result',
        result: {
          status: 'error',
          error: new ForecastError('provider', 'x'),
          forecast: null,
          freshness: null,
        },
      },
      NOW,
    );
    expect(prov).toMatchObject({ kind: 'message', title: 'Weather is unavailable' });
  });
  it('explains denied and undetermined permission', () => {
    expect(describeWeather({ status: 'permission', permission: 'denied' }, NOW)).toMatchObject({
      kind: 'message',
      action: 'device_settings',
    });
    expect(
      describeWeather({ status: 'permission', permission: 'undetermined' }, NOW),
    ).toMatchObject({ kind: 'message', action: 'settings' });
  });
  it('handles position and settings failures', () => {
    expect(describeWeather({ status: 'position_failed' }, NOW)).toMatchObject({ action: 'retry' });
    expect(describeWeather({ status: 'settings_failed' }, NOW)).toMatchObject({ action: 'retry' });
  });
});
