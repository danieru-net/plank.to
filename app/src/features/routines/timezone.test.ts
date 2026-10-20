/**
 * Runs timezone.cases.ts under several `TZ` values (spring-forward, fall-back, southern
 * hemisphere, no-DST, UTC). Jest cannot switch timezone in-process, so each zone is a child
 * Jest run. See docs/device-test-checklist.md for what this does not cover.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const TIMEZONES = [
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
  'Asia/Kolkata',
  'UTC',
];

describe('DST and timezone behavior', () => {
  it.each(TIMEZONES)(
    'passes in %s',
    (tz) => {
      const root = path.resolve(__dirname, '../../..');
      const result = spawnSync(
        process.execPath,
        [
          path.join(root, 'node_modules/jest/bin/jest.js'),
          '--runTestsByPath',
          path.join(__dirname, 'timezone.cases.ts'),
          '--testMatch',
          '**/timezone.cases.ts',
        ],
        { cwd: root, env: { ...process.env, TZ: tz }, encoding: 'utf8' },
      );
      if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
    },
    60_000,
  );
});
