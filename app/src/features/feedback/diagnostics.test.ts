import { diagnosticLines, type DeviceDetails } from './diagnostics';

const details: DeviceDetails = {
  appVersion: '1.0.0',
  buildNumber: '7',
  osName: 'iOS',
  osVersion: '27.0',
  deviceModel: 'iPhone 17',
  textScale: 1.3,
  colorTheme: 'blossom',
};

describe('diagnosticLines', () => {
  it('lists each detail with a readable label', () => {
    expect(diagnosticLines(details)).toEqual([
      { label: 'App version', value: '1.0.0 (7)' },
      { label: 'System', value: 'iOS 27.0' },
      { label: 'Device', value: 'iPhone 17' },
      { label: 'Text size', value: 'Larger' },
      { label: 'Colors', value: 'Blossom (pink)' },
    ]);
  });

  it('says "Unknown" instead of leaving a value out', () => {
    const lines = diagnosticLines({
      ...details,
      appVersion: null,
      buildNumber: null,
      osName: null,
      osVersion: null,
      deviceModel: null,
    });
    expect(lines.slice(0, 3).map((l) => l.value)).toEqual(['Unknown', 'Unknown', 'Unknown']);
  });

  it('shows the version without a build number when there is none', () => {
    expect(diagnosticLines({ ...details, buildNumber: null })[0].value).toBe('1.0.0');
  });

  it('only contains app, system and display details', () => {
    expect(diagnosticLines(details).map((l) => l.label)).toEqual([
      'App version',
      'System',
      'Device',
      'Text size',
      'Colors',
    ]);
  });
});
