/**
 * Assertions that depend on the process timezone. This file is NOT picked up by `npm test`
 * directly (its name does not match Jest's test patterns); timezone.test.ts runs it once per
 * timezone with `TZ` set, because Jest cannot change the timezone inside a running worker.
 * Expected instants are written in UTC so they do not depend on the machine's own timezone.
 */
import type { Routine } from '@/db/routineRepository';
import type { Task } from '@/db/taskRepository';
import { loadReminderPlan, planTaskReminders } from '@/features/notifications/reminderPlan';
import { occurrencesBetween, toLocalDate } from './recurrence';

const tz = process.env.TZ ?? '';
const iso = (d: Date) => d.toISOString();

/** timezone -> [date, time, expected UTC instant, note] */
const TO_LOCAL_DATE: Record<string, [string, string, string, string][]> = {
  'America/New_York': [
    ['2026-03-08', '01:30', '2026-03-08T06:30:00.000Z', 'before the gap (EST)'],
    ['2026-03-08', '02:30', '2026-03-08T07:30:00.000Z', 'in the gap moves to 03:30 EDT'],
    ['2026-03-08', '03:30', '2026-03-08T07:30:00.000Z', 'after the gap (EDT)'],
    ['2026-11-01', '01:30', '2026-11-01T05:30:00.000Z', 'repeated hour uses the first (EDT)'],
    ['2026-11-01', '02:30', '2026-11-01T07:30:00.000Z', 'after fall back (EST)'],
  ],
  'Europe/London': [
    ['2026-03-29', '01:30', '2026-03-29T01:30:00.000Z', 'in the gap moves to 02:30 BST'],
    ['2026-10-25', '01:30', '2026-10-25T00:30:00.000Z', 'repeated hour uses the first (BST)'],
  ],
  'Europe/Berlin': [
    ['2026-03-29', '02:30', '2026-03-29T01:30:00.000Z', 'in the gap moves to 03:30 CEST'],
  ],
  'Australia/Sydney': [
    ['2026-10-04', '02:30', '2026-10-03T16:30:00.000Z', 'southern hemisphere gap'],
    ['2026-04-05', '02:30', '2026-04-04T15:30:00.000Z', 'repeated hour uses the first (AEDT)'],
  ],
  'Asia/Kolkata': [['2026-03-08', '02:30', '2026-03-07T21:00:00.000Z', 'no DST, unchanged']],
  UTC: [['2026-03-08', '02:30', '2026-03-08T02:30:00.000Z', 'UTC has no gap']],
};

/** 09:00 on 2026-03-08 in each timezone: the instant moves with the device timezone (travel). */
const NINE_AM: Record<string, string> = {
  'America/New_York': '2026-03-08T13:00:00.000Z', // already EDT (UTC-4) after 02:00
  'Europe/London': '2026-03-08T09:00:00.000Z',
  'Europe/Berlin': '2026-03-08T08:00:00.000Z',
  'Australia/Sydney': '2026-03-07T22:00:00.000Z', // AEDT, UTC+11
  'Asia/Kolkata': '2026-03-08T03:30:00.000Z',
  UTC: '2026-03-08T09:00:00.000Z',
};

/** Offset on 2026-01-15, in minutes behind UTC (proves TZ took effect). */
const OFFSET_JAN: Record<string, number> = {
  'America/New_York': 300,
  'Europe/London': 0,
  'Europe/Berlin': -60,
  'Australia/Sydney': -660,
  'Asia/Kolkata': -330,
  UTC: 0,
};

const task = (over: Partial<Task>): Task => ({
  id: 't1',
  title: 'Call',
  notes: null,
  date: '2026-03-08',
  time: '09:00',
  symbol: null,
  imageUri: null,
  status: 'pending',
  statusChangedAt: null,
  reminderEnabled: true,
  reminderAdvanceMinutes: 0,
  routineId: null,
  routineOccurrenceDate: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe(`timezone ${tz}`, () => {
  it('runs in the requested timezone', () => {
    expect(new Date('2026-01-15T00:00:00Z').getTimezoneOffset()).toBe(OFFSET_JAN[tz]);
  });

  it.each(TO_LOCAL_DATE[tz] ?? [])('toLocalDate %s %s -> %s (%s)', (date, time, expected) => {
    expect(iso(toLocalDate(date, time))).toBe(expected);
  });

  it('generates exactly one occurrence per day across both DST transitions', () => {
    const routine = { time: '02:30', weekdays: 127, startDate: '2026-03-01', paused: false };
    const dates = occurrencesBetween(routine, [], '2026-03-01', '2026-11-30').map((o) => o.date);
    expect(dates).toHaveLength(275); // Mar 1 to Nov 30 inclusive
    expect(new Set(dates).size).toBe(275);
    // Same weekdays everywhere: 2026-03-02 is a Monday regardless of timezone.
    const mondays = occurrencesBetween(
      { ...routine, weekdays: 1 << 1 },
      [],
      '2026-03-01',
      '2026-03-31',
    ).map((o) => o.date);
    expect(mondays).toEqual(['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30']);
  });

  it('keeps a task at the same wall-clock time (instant follows the device timezone)', () => {
    const [r] = planTaskReminders([task({})], new Date('2026-03-01T00:00:00Z'));
    expect(r && iso(r.fireAt)).toBe(NINE_AM[tz]);
  });

  it('plans a daily routine with one reminder per day over the fall-back week', async () => {
    const routine: Routine = {
      id: 'r1',
      title: 'Shower',
      notes: null,
      time: '01:30',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-10-01',
      symbol: null,
      imageUri: null,
      paused: false,
      reminderEnabled: true,
      reminderAdvanceMinutes: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    const plan = await loadReminderPlan(
      { listTasksForDate: async () => [] },
      { listRoutines: async () => [routine], listOccurrenceOverrides: async () => [] },
      new Date(2026, 9, 30, 12, 0), // local noon on Oct 30, after that day's 01:30
      7,
    );
    expect(plan.map((p) => p.id)).toEqual([
      'routine:r1:2026-10-31',
      'routine:r1:2026-11-01',
      'routine:r1:2026-11-02',
      'routine:r1:2026-11-03',
      'routine:r1:2026-11-04',
      'routine:r1:2026-11-05',
    ]);
    // Every reminder fires at 01:30 local wall-clock time, one calendar day apart.
    for (const p of plan) expect(p.fireAt.getHours()).toBe(1);
    if (tz === 'America/New_York') {
      const byId = (d: string) => plan.find((p) => p.id.endsWith(d))?.fireAt.toISOString();
      expect(byId('2026-11-01')).toBe('2026-11-01T05:30:00.000Z'); // repeated hour: first, EDT
      expect(byId('2026-11-02')).toBe('2026-11-02T06:30:00.000Z'); // EST
    }
  });
});

describe('spring-forward advance notice (America/New_York only)', () => {
  (tz === 'America/New_York' ? it : it.skip)('is real elapsed time across the gap', () => {
    // 03:30 EDT minus 60 min is 06:30Z, which is 01:30 EST.
    const [r] = planTaskReminders(
      [task({ time: '03:30', reminderAdvanceMinutes: 60 })],
      new Date('2026-03-01T00:00:00Z'),
    );
    expect(r && iso(r.fireAt)).toBe('2026-03-08T06:30:00.000Z');
  });
});
