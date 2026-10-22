import type { Routine } from '@/db/routineRepository';
import type { OccurrenceException } from './recurrence';
import { loadRoutineChanges, routineChangesForDate } from './routineChanges';

// 2026-03-02 is a Monday.
const TODAY = '2026-03-02';

function routine(patch: Partial<Routine> = {}): Routine {
  return {
    id: 'swim',
    title: 'Swimming',
    notes: null,
    time: '16:00',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-03-01',
    symbol: null,
    imageUri: null,
    paused: false,
    reminderEnabled: false,
    reminderAdvanceMinutes: 0,
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  };
}

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

const changes = (r: Routine, exceptions: OccurrenceException[], date = TODAY) =>
  routineChangesForDate([r], new Map([[r.id, exceptions]]), date).map((c) => c.message);

describe('routineChangesForDate', () => {
  it('says nothing when the routine runs as usual', () => {
    expect(changes(routine(), [])).toEqual([]);
  });

  it('describes a new time on the same day', () => {
    expect(changes(routine(), [exception(TODAY, { movedTime: '17:00' })])).toEqual([
      'Swimming moved to 17:00 today.',
    ]);
  });

  it('describes an occurrence moved here from another day', () => {
    const r = routine({ weekdays: [0] });
    expect(changes(r, [exception('2026-03-01', { movedDate: TODAY, movedTime: '17:00' })])).toEqual(
      ['Swimming moved from Sunday to 17:00 today.'],
    );
  });

  it('describes an occurrence moved away from this day', () => {
    expect(changes(routine(), [exception(TODAY, { movedDate: '2026-03-05' })])).toEqual([
      'Swimming moved to Thursday, March 5 at 16:00.',
    ]);
  });

  it('describes a skipped day', () => {
    expect(changes(routine(), [exception(TODAY, { status: 'dismissed' })])).toEqual([
      'Swimming is skipped today.',
    ]);
  });

  it('describes a different title and notes, using the usual name', () => {
    expect(changes(routine(), [exception(TODAY, { title: 'Swim lesson' })])).toEqual([
      'Swimming is called “Swim lesson” today.',
    ]);
    expect(changes(routine(), [exception(TODAY, { notes: 'Bring goggles' })])).toEqual([
      'Swimming has different notes today.',
    ]);
    expect(
      changes(routine(), [exception(TODAY, { movedTime: '17:00', title: 'Swim lesson' })]),
    ).toEqual(['Swimming moved to 17:00 today. It is called “Swim lesson” today.']);
  });

  it('leaves out completed occurrences and other days', () => {
    expect(
      changes(routine(), [exception(TODAY, { status: 'completed', movedTime: '17:00' })]),
    ).toEqual([]);
    expect(changes(routine(), [exception('2026-03-03', { movedTime: '17:00' })])).toEqual([]);
  });

  it('ignores a change to a day the routine no longer runs on', () => {
    const r = routine({ weekdays: [2] });
    expect(changes(r, [exception(TODAY, { status: 'dismissed' })])).toEqual([]);
  });

  it('gives each change a stable key', () => {
    const r = routine();
    const [change] = routineChangesForDate(
      [r],
      new Map([[r.id, [exception(TODAY, { status: 'dismissed' })]]]),
      TODAY,
    );
    expect(change?.key).toBe(`swim:${TODAY}`);
  });
});

describe('loadRoutineChanges', () => {
  it('skips paused routines', async () => {
    const repo = {
      listRoutines: async () => [
        routine(),
        routine({ id: 'paused', title: 'Piano', paused: true }),
      ],
      listOccurrenceOverrides: async (id: string) => [
        { id: `o-${id}`, routineId: id, ...exception(TODAY, { status: 'dismissed' as const }) },
      ],
    };
    expect((await loadRoutineChanges(repo, TODAY)).map((c) => c.message)).toEqual([
      'Swimming is skipped today.',
    ]);
  });
});
