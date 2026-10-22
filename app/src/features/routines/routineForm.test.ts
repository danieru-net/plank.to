import { ValidationError } from '@/db/errors';
import {
  allWeekdays,
  emptyRoutineForm,
  formToRoutineInput,
  isEveryDay,
  routineErrorsFrom,
  toggleWeekday,
} from './routineForm';

describe('routineForm', () => {
  it('toggles weekdays and keeps them sorted', () => {
    let days: number[] = [];
    days = toggleWeekday(days, 5);
    days = toggleWeekday(days, 1);
    expect(days).toEqual([1, 5]);
    expect(toggleWeekday(days, 5)).toEqual([1]);
  });

  it('"Every day" selects all seven days', () => {
    expect(allWeekdays()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(isEveryDay(allWeekdays())).toBe(true);
    expect(isEveryDay([1, 2, 3])).toBe(false);
    expect(isEveryDay([])).toBe(false);
  });

  it('builds repository input with a normalized time', () => {
    const input = formToRoutineInput({
      ...emptyRoutineForm('2026-03-01'),
      title: 'Shower',
      time: '7:00',
      weekdays: allWeekdays(),
    });
    expect(input).toMatchObject({
      title: 'Shower',
      time: '07:00',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-03-01',
    });
  });

  it('starts with reminders off and passes the choice to the repository input', () => {
    const blank = emptyRoutineForm('2026-03-01', 15);
    expect(blank).toMatchObject({ reminderEnabled: false, reminderAdvanceMinutes: 15 });
    expect(
      formToRoutineInput({
        ...blank,
        title: 'Shower',
        time: '19:00',
        weekdays: [1],
        reminderEnabled: true,
      }),
    ).toMatchObject({ reminderEnabled: true, reminderAdvanceMinutes: 15 });
  });

  it('maps validation issues to fields', () => {
    const err = new ValidationError([
      { field: 'weekdays', message: 'Choose at least one day of the week.' },
      { field: 'time', message: 'Bad time.' },
      { field: 'imageUri', message: 'Choose a picture saved on this device.' },
      { field: 'paused', message: 'Other.' },
    ]);
    expect(routineErrorsFrom(err)).toEqual({
      weekdays: 'Choose at least one day of the week.',
      time: 'Bad time.',
      imageUri: 'Choose a picture saved on this device.',
      title: 'Other.',
    });
    expect(routineErrorsFrom(new Error('x'))).toBeNull();
  });
});
