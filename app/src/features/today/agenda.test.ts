import type { Task } from '@/db/taskRepository';
import { addDays, groupAgenda, nextTaskId, statusText } from './agenda';

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

describe('nextTaskId', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 20, h, m);
  it('picks the first pending timed task at or after now', () => {
    const timed = groupAgenda([task('a', '07:00'), task('b', '09:30'), task('c', '18:00')]).timed;
    expect(nextTaskId(timed, at(8, 0))).toBe('b');
    expect(nextTaskId(timed, at(9, 30))).toBe('b');
    expect(nextTaskId(timed, at(6, 0))).toBe('a');
  });
  it('returns null when every timed task is earlier or done', () => {
    const timed = [task('a', '07:00'), { ...task('b', '20:00'), status: 'completed' as const }];
    expect(nextTaskId(timed, at(12, 0))).toBeNull();
  });
});
