import { routineSummary, weekdaysSpoken, weekdaysSummary } from './routineSummary';

describe('routine summaries', () => {
  it('summarizes weekdays Monday first', () => {
    expect(weekdaysSummary([0, 1, 2, 3, 4, 5, 6])).toBe('Every day');
    expect(weekdaysSummary([5, 1, 3])).toBe('Mon, Wed, Fri');
    expect(weekdaysSummary([0, 6])).toBe('Sat, Sun');
    expect(weekdaysSummary([])).toBe('No days');
  });

  it('spells out days for screen readers', () => {
    expect(weekdaysSpoken([1, 3])).toBe('Monday, Wednesday');
    expect(weekdaysSpoken([0, 1, 2, 3, 4, 5, 6])).toBe('every day');
  });

  it('builds the list line and marks paused routines in words', () => {
    expect(routineSummary({ time: '19:00', weekdays: [1, 3], paused: false })).toBe(
      '19:00 · Mon, Wed',
    );
    expect(routineSummary({ time: '07:30', weekdays: [0, 1, 2, 3, 4, 5, 6], paused: true })).toBe(
      '07:30 · Every day · Paused',
    );
  });
});
