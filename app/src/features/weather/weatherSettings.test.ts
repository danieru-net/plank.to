import {
  defaultWeatherSettings,
  deviceLocationExplanation,
  isValidCoordinate,
  locationPermissionText,
  normalizeSearchText,
  parseWeatherSettings,
  roundCoordinate,
  toLocationPermission,
  weatherDisclosure,
} from './weatherSettings';

const manualRow = {
  mode: 'manual' as const,
  manual_label: 'Oslo, Norway',
  manual_latitude: 59.91,
  manual_longitude: 10.75,
};

describe('parseWeatherSettings', () => {
  it('is off by default, with no preference or no row', () => {
    expect(parseWeatherSettings(null, undefined)).toEqual(defaultWeatherSettings);
    expect(defaultWeatherSettings.enabled).toBe(false);
    expect(parseWeatherSettings({ ...manualRow }, undefined)).toEqual(defaultWeatherSettings);
    expect(parseWeatherSettings({ ...manualRow }, 'yes')).toEqual(defaultWeatherSettings);
  });

  it('ignores a stored location while weather is disabled', () => {
    expect(parseWeatherSettings(manualRow, false).location).toEqual({ mode: 'off' });
  });

  it('reads device and manual locations when enabled', () => {
    expect(
      parseWeatherSettings(
        { mode: 'device', manual_label: null, manual_latitude: null, manual_longitude: null },
        true,
      ),
    ).toEqual({ enabled: true, location: { mode: 'device' } });
    expect(parseWeatherSettings(manualRow, true)).toEqual({
      enabled: true,
      location: { mode: 'manual', label: 'Oslo, Norway', latitude: 59.91, longitude: 10.75 },
    });
  });

  it('falls back to no location for an incomplete manual row', () => {
    expect(parseWeatherSettings({ ...manualRow, manual_label: null }, true)).toEqual({
      enabled: true,
      location: { mode: 'off' },
    });
    expect(parseWeatherSettings({ ...manualRow, manual_latitude: null }, true).location).toEqual({
      mode: 'off',
    });
  });
});

describe('coordinates', () => {
  it('rounds to 2 decimals', () => {
    expect(roundCoordinate(59.913869)).toBe(59.91);
    expect(roundCoordinate(-10.756)).toBe(-10.76);
  });
  it('validates ranges and types', () => {
    expect(isValidCoordinate(90, -180)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, NaN)).toBe(false);
    expect(isValidCoordinate('1', 2)).toBe(false);
  });
});

describe('permission and copy', () => {
  it('maps OS responses', () => {
    expect(toLocationPermission({ status: 'granted', granted: true })).toBe('granted');
    expect(toLocationPermission({ status: 'denied', granted: false })).toBe('denied');
    expect(toLocationPermission({ status: 'undetermined', granted: false })).toBe('undetermined');
    expect(toLocationPermission({ status: 'odd', granted: false })).toBe('undetermined');
  });
  it('has text for every permission state', () => {
    expect(Object.keys(locationPermissionText).sort()).toEqual([
      'denied',
      'granted',
      'undetermined',
    ]);
  });
  it('discloses what is sent and offers alternatives', () => {
    expect(weatherDisclosure).toMatch(/off/);
    expect(weatherDisclosure).toMatch(/Open-Meteo/);
    expect(weatherDisclosure).toMatch(/IP address/);
    expect(weatherDisclosure).toMatch(/never sends your tasks/);
    expect(deviceLocationExplanation).toMatch(/instead/);
  });
  it('requires 3 characters to search', () => {
    expect(normalizeSearchText('  Os ')).toBeNull();
    expect(normalizeSearchText(' Oslo ')).toBe('Oslo');
  });
});
