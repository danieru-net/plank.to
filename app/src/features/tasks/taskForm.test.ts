import { ValidationError } from '@/db/errors';
import type { Task } from '@/db/taskRepository';
import {
  emptyForm,
  errorsFrom,
  formToInput,
  normalizeTimeText,
  taskToForm,
  toLocalDateString,
} from './taskForm';

describe('taskForm', () => {
  it('formats a local date', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('normalizes single-digit hours only', () => {
    expect(normalizeTimeText(' 7:05 ')).toBe('07:05');
    expect(normalizeTimeText('19:00')).toBe('19:00');
    expect(normalizeTimeText('7pm')).toBe('7pm');
  });

  it('turns blank optional fields into null time', () => {
    const input = formToInput({ ...emptyForm('2026-03-01'), title: 'Shower', time: ' ' });
    expect(input).toMatchObject({ title: 'Shower', date: '2026-03-01', time: null });
  });

  it('round-trips a task', () => {
    const task = {
      title: 'Walk',
      date: '2026-03-01',
      time: '08:30',
      notes: null,
      symbol: '🏃',
      steps: [{ id: 'a', title: 'Shoes' }],
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
    } as Task;
    expect(taskToForm(task)).toEqual({
      title: 'Walk',
      date: '2026-03-01',
      time: '08:30',
      notes: '',
      steps: ['Shoes'],
      symbol: '🏃',
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
    });
  });

  it('starts with reminders off and passes the choice to the repository input', () => {
    const blank = emptyForm('2026-03-01', 30);
    expect(blank).toMatchObject({ reminderEnabled: false, reminderAdvanceMinutes: 30 });
    expect(
      formToInput({ ...blank, title: 'Call', reminderEnabled: true, reminderAdvanceMinutes: 5 }),
    ).toMatchObject({ reminderEnabled: true, reminderAdvanceMinutes: 5 });
  });

  it('maps validation issues to fields', () => {
    const err = new ValidationError([
      { field: 'title', message: 'Enter a title for the task.' },
      { field: 'time', message: 'Bad time.' },
      { field: 'reminderAdvanceMinutes', message: 'Pick a lead time.' },
    ]);
    expect(errorsFrom(err)).toEqual({
      title: 'Enter a title for the task.',
      time: 'Bad time.',
      reminderAdvanceMinutes: 'Pick a lead time.',
    });
    expect(errorsFrom(new Error('x'))).toBeNull();
  });
});
