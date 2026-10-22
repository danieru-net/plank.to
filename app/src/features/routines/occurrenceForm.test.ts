import { ValidationError } from '@/db/errors';
import type { Routine } from '@/db/routineRepository';
import {
  formToOccurrencePatch,
  occurrenceDetails,
  occurrenceErrorsFrom,
  occurrenceStatusText,
  occurrenceToForm,
} from './occurrenceForm';
import { resolveOccurrence } from './recurrence';
import { loadRoutineOccurrences, routineOccurrencesForDate } from './routineAgenda';

const routine: Routine = {
  id: 'r1',
  title: 'Shower',
  notes: 'Warm water',
  time: '19:00',
  weekdays: [1, 3],
  startDate: '2026-10-01',
  symbol: null,
  imageUri: null,
  paused: false,
  reminderEnabled: false,
  reminderAdvanceMinutes: 0,
  createdAt: 1,
  updatedAt: 1,
};
const schedule = { time: '19:00', weekdays: 0b0001010, startDate: '2026-10-01', paused: false };
const monday = '2026-10-19';

describe('occurrenceForm', () => {
  it('shows the routine values when there is no exception', () => {
    const occ = resolveOccurrence(schedule, monday, undefined);
    expect(occurrenceToForm(occurrenceDetails(routine, occ))).toEqual({
      title: 'Shower',
      notes: 'Warm water',
      date: monday,
      time: '19:00',
    });
    expect(occurrenceStatusText(occ)).toBeNull();
  });

  it('stores values equal to the routine as null so they keep following it', () => {
    const patch = formToOccurrencePatch(routine, monday, {
      title: 'Shower',
      notes: 'Warm water',
      date: monday,
      time: '19:00',
    });
    expect(patch).toEqual({ title: null, notes: null, movedDate: null, movedTime: null });
  });

  it('stores only the fields that differ, normalizing the time', () => {
    const patch = formToOccurrencePatch(routine, monday, {
      title: 'Quick shower',
      notes: 'Warm water',
      date: '2026-10-20',
      time: '7:30',
    });
    expect(patch).toEqual({
      title: 'Quick shower',
      notes: null,
      movedDate: '2026-10-20',
      movedTime: '07:30',
    });
  });

  it('maps validation issues to form fields', () => {
    const errors = occurrenceErrorsFrom(
      new ValidationError([
        { field: 'movedDate', message: 'bad date' },
        { field: 'movedTime', message: 'bad time' },
      ]),
    );
    expect(errors).toEqual({ date: 'bad date', time: 'bad time' });
    expect(occurrenceErrorsFrom(new Error('x'))).toBeNull();
  });

  it('describes changed, skipped, and done days', () => {
    const base = {
      occurrenceDate: monday,
      title: null,
      notes: null,
      movedDate: null,
      movedTime: null,
      reminderEnabled: null,
    };
    const status = (o: object) =>
      occurrenceStatusText(
        resolveOccurrence(schedule, monday, { ...base, status: 'pending', ...o }),
      );
    expect(status({ title: 'x' })).toBe('Changed for this day');
    expect(status({ movedTime: '20:00' })).toBe('Changed for this day');
    expect(status({ status: 'dismissed' })).toBe('Skipped');
    expect(status({ status: 'completed' })).toBe('Done');
  });
});

describe('routineAgenda', () => {
  const none = new Map();

  it('lists a routine on the days it repeats, ordered by time', () => {
    const late = { ...routine, id: 'r2', title: 'Read', time: '21:00' };
    const items = routineOccurrencesForDate([late, routine], none, monday);
    expect(items.map((i) => i.details.title)).toEqual(['Shower', 'Read']);
    expect(routineOccurrencesForDate([routine], none, '2026-10-20')).toEqual([]);
  });

  it('applies a one-day change without affecting another day', () => {
    const overrides = new Map([
      [
        'r1',
        [
          {
            occurrenceDate: monday,
            status: 'pending' as const,
            title: 'Quick shower',
            notes: null,
            movedDate: null,
            movedTime: '07:00',
            reminderEnabled: null,
          },
        ],
      ],
    ]);
    const [changed] = routineOccurrencesForDate([routine], overrides, monday);
    expect(changed?.details).toMatchObject({ title: 'Quick shower', time: '07:00' });
    const [other] = routineOccurrencesForDate([routine], overrides, '2026-10-21');
    expect(other?.details).toMatchObject({ title: 'Shower', time: '19:00' });
  });

  it('shows an occurrence moved from another day on its new date only', () => {
    const overrides = new Map([
      [
        'r1',
        [
          {
            occurrenceDate: monday,
            status: 'pending' as const,
            title: null,
            notes: null,
            movedDate: '2026-10-20',
            movedTime: null,
            reminderEnabled: null,
          },
        ],
      ],
    ]);
    expect(routineOccurrencesForDate([routine], overrides, monday)).toEqual([]);
    expect(routineOccurrencesForDate([routine], overrides, '2026-10-20')).toHaveLength(1);
  });

  it('skips paused routines when loading', async () => {
    const repo = {
      listRoutines: async () => [{ ...routine, paused: true }],
      listOccurrenceOverrides: async () => [],
    };
    expect(await loadRoutineOccurrences(repo as any, monday)).toEqual([]);
  });
});
