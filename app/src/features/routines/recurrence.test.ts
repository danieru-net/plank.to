import {
  ALL_WEEKDAYS,
  isValidWeekdayMask,
  maskToWeekdays,
  occurrencesBetween,
  occursOn,
  toLocalDate,
  weekdayOf,
  weekdaysToMask,
  type OccurrenceException,
  type RoutineSchedule,
} from './recurrence';

// 2026-03-01 is a Sunday.
const daily: RoutineSchedule = {
  time: '19:00',
  weekdays: ALL_WEEKDAYS,
  startDate: '2026-03-01',
  paused: false,
};

function exception(date: string, patch: Partial<OccurrenceException> = {}): OccurrenceException {
  return {
    occurrenceDate: date,
    status: 'pending',
    title: null,
    notes: null,
    movedDate: null,
    movedTime: null,
    reminderEnabled: null,
    ...patch,
  };
}

describe('weekday masks', () => {
  it('computes weekdays from calendar dates', () => {
    expect(weekdayOf('2026-03-01')).toBe(0);
    expect(weekdayOf('2026-03-07')).toBe(6);
    expect(weekdayOf('2024-02-29')).toBe(4);
  });

  it('round-trips weekdays and masks', () => {
    expect(weekdaysToMask([1, 3, 5])).toBe(0b0101010);
    expect(maskToWeekdays(0b0101010)).toEqual([1, 3, 5]);
    expect(weekdaysToMask([0, 1, 2, 3, 4, 5, 6])).toBe(ALL_WEEKDAYS);
  });

  it('rejects invalid weekday numbers and masks', () => {
    expect(() => weekdaysToMask([7])).toThrow(RangeError);
    expect(isValidWeekdayMask(0)).toBe(false);
    expect(isValidWeekdayMask(128)).toBe(false);
    expect(isValidWeekdayMask(1.5)).toBe(false);
    expect(isValidWeekdayMask(127)).toBe(true);
  });
});

describe('occursOn', () => {
  it('generates every day for the all-days mask', () => {
    expect(occursOn(daily, '2026-03-04')).toBe(true);
  });

  it('only generates on selected weekdays', () => {
    const monWed = { ...daily, weekdays: weekdaysToMask([1, 3]) };
    expect(occursOn(monWed, '2026-03-02')).toBe(true);
    expect(occursOn(monWed, '2026-03-03')).toBe(false);
    expect(occursOn(monWed, '2026-03-04')).toBe(true);
  });

  it('does not backfill before the start date', () => {
    expect(occursOn(daily, '2026-02-28')).toBe(false);
  });

  it('generates nothing when paused or when the mask is empty', () => {
    expect(occursOn({ ...daily, paused: true }, '2026-03-04')).toBe(false);
    expect(occursOn({ ...daily, weekdays: 0 }, '2026-03-04')).toBe(false);
  });
});

describe('occurrencesBetween', () => {
  it('lists occurrences in range in order', () => {
    const monWed = { ...daily, weekdays: weekdaysToMask([1, 3]) };
    const dates = occurrencesBetween(monWed, [], '2026-03-01', '2026-03-10').map((o) => o.date);
    expect(dates).toEqual(['2026-03-02', '2026-03-04', '2026-03-09']);
  });

  it('keeps a dismissed occurrence, marked, without affecting others', () => {
    const list = occurrencesBetween(
      daily,
      [exception('2026-03-02', { status: 'dismissed' })],
      '2026-03-01',
      '2026-03-03',
    );
    expect(list.map((o) => o.status)).toEqual(['pending', 'dismissed', 'pending']);
  });

  it('moves an occurrence to another date and time only for that instance', () => {
    const list = occurrencesBetween(
      daily,
      [exception('2026-03-02', { movedDate: '2026-03-03', movedTime: '08:15' })],
      '2026-03-01',
      '2026-03-03',
    );
    expect(list.map((o) => `${o.date} ${o.time}`)).toEqual([
      '2026-03-01 19:00',
      '2026-03-03 08:15',
      '2026-03-03 19:00',
    ]);
    expect(list[1]?.moved).toBe(true);
    expect(list[1]?.occurrenceDate).toBe('2026-03-02');
  });

  it('finds an occurrence moved into the window from outside it', () => {
    const list = occurrencesBetween(
      daily,
      [exception('2026-03-01', { movedDate: '2026-03-20' })],
      '2026-03-20',
      '2026-03-20',
    );
    expect(list.map((o) => o.occurrenceDate)).toEqual(['2026-03-01', '2026-03-20']);
  });

  it('carries title, notes and reminder overrides', () => {
    const [o] = occurrencesBetween(
      daily,
      [exception('2026-03-02', { title: 'Quick shower', reminderEnabled: false })],
      '2026-03-02',
      '2026-03-02',
    );
    expect(o).toMatchObject({ title: 'Quick shower', notes: null, reminderEnabled: false });
  });

  it('ignores an exception whose date the routine no longer generates', () => {
    const monday = { ...daily, weekdays: weekdaysToMask([1]) };
    const list = occurrencesBetween(
      monday,
      [exception('2026-03-03', { movedDate: '2026-03-04' })],
      '2026-03-01',
      '2026-03-07',
    );
    expect(list.map((o) => o.date)).toEqual(['2026-03-02']);
  });

  it('returns nothing for a paused routine or an inverted range', () => {
    expect(occurrencesBetween({ ...daily, paused: true }, [], '2026-03-01', '2026-03-07')).toEqual(
      [],
    );
    expect(occurrencesBetween(daily, [], '2026-03-07', '2026-03-01')).toEqual([]);
  });

  it('is stable across month, year, and leap-day boundaries', () => {
    const dates = occurrencesBetween(daily, [], '2027-12-30', '2028-01-02').map((o) => o.date);
    expect(dates).toEqual(['2027-12-30', '2027-12-31', '2028-01-01', '2028-01-02']);
    expect(occursOn(daily, '2028-02-29')).toBe(true);
  });
});

describe('toLocalDate', () => {
  it('builds a local wall-clock Date with the requested components', () => {
    const d = toLocalDate('2026-03-05', '19:00');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 2, 5, 19, 0,
    ]);
  });
});
