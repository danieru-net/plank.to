import type { Task } from '@/db/taskRepository';
import { addDays, groupAgenda, statusText } from './agenda';

function task(id: string, time: string | null, createdAt = 1): Task {
  return {
    id,
    title: id,
    notes: null,
    date: '2026-03-01',
    time,
    symbol: null,
    imageUri: null,
    status: 'pending',
    statusChangedAt: null,
    reminderEnabled: false,
    reminderAdvanceMinutes: 0,
    routineId: null,
    routineOccurrenceDate: null,
    steps: [],
    createdAt,
    updatedAt: createdAt,
  };
}

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('groupAgenda', () => {
  it('orders timed tasks chronologically and keeps untimed tasks visible', () => {
    const { timed, untimed } = groupAgenda([
      task('any', null),
      task('late', '19:00'),
      task('early', '07:30'),
    ]);
    expect(timed.map((t) => t.id)).toEqual(['early', 'late']);
    expect(untimed.map((t) => t.id)).toEqual(['any']);
  });

  it('returns empty groups for no tasks', () => {
    expect(groupAgenda([])).toEqual({ timed: [], untimed: [] });
  });
});

describe('statusText', () => {
  it('labels non-pending statuses', () => {
    expect(statusText('pending')).toBeNull();
    expect(statusText('completed')).toBe('Done');
    expect(statusText('dismissed')).toBe('Dismissed');
  });
});
