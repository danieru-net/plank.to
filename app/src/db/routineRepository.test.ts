import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { StorageError, ValidationError } from './errors';
import { migrate } from './migrate';
import { createRoutineRepository } from './routineRepository';
import type { TaskDb } from './taskRepository';

function adapt(raw: DatabaseSync): TaskDb {
  const p = (params?: (string | number | null)[]) => (params ?? []) as SQLInputValue[];
  return {
    runAsync: async (sql, params) => raw.prepare(sql).run(...p(params)),
    getFirstAsync: async <T>(sql: string, params?: (string | number | null)[]) =>
      (raw.prepare(sql).get(...p(params)) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, params?: (string | number | null)[]) =>
      raw.prepare(sql).all(...p(params)) as T[],
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

async function setup() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  await migrate({
    execAsync: async (sql) => raw.exec(sql),
    getFirstAsync: async <T>(sql: string) => (raw.prepare(sql).get() as T | undefined) ?? null,
  });
  let n = 0;
  let clock = 1_000;
  const repo = createRoutineRepository(adapt(raw), {
    newId: () => `id-${++n}`,
    now: () => (clock += 10),
  });
  return { raw, repo };
}

const base = { title: 'Brush teeth', time: '21:00', weekdays: [1, 3, 5], startDate: '2026-10-19' };

async function issuesOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    return (e as ValidationError).issues.map((i) => i.field);
  }
  throw new Error('expected a ValidationError');
}

describe('routine repository', () => {
  it('creates a routine on selected weekdays and reads it back', async () => {
    const { repo } = await setup();
    const routine = await repo.createRoutine({ ...base, title: '  Brush teeth  ' });
    expect(routine).toMatchObject({
      title: 'Brush teeth',
      time: '21:00',
      weekdays: [1, 3, 5],
      startDate: '2026-10-19',
      paused: false,
      notes: null,
    });
    expect(await repo.getRoutine(routine.id)).toEqual(routine);
  });

  it('stores all seven days and de-duplicates repeated weekdays', async () => {
    const { repo, raw } = await setup();
    const every = await repo.createRoutine({ ...base, weekdays: [0, 1, 2, 3, 4, 5, 6] });
    expect(every.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const row = raw.prepare('SELECT weekdays FROM routines WHERE id = ?').get(every.id);
    expect(row).toEqual({ weekdays: 127 });
    const dup = await repo.createRoutine({ ...base, weekdays: [6, 6, 0] });
    expect(dup.weekdays).toEqual([0, 6]);
  });

  it('rejects empty or invalid weekday selections', async () => {
    const { repo } = await setup();
    expect(await issuesOf(repo.createRoutine({ ...base, weekdays: [] }))).toEqual(['weekdays']);
    expect(await issuesOf(repo.createRoutine({ ...base, weekdays: [7] }))).toEqual(['weekdays']);
    expect(await issuesOf(repo.createRoutine({ ...base, weekdays: [-1] }))).toEqual(['weekdays']);
    expect(await issuesOf(repo.createRoutine({ ...base, weekdays: [1.5] }))).toEqual(['weekdays']);
    expect(await repo.listRoutines()).toEqual([]);
  });

  it('reports every invalid field at once', async () => {
    const { repo } = await setup();
    const fields = await issuesOf(
      repo.createRoutine({
        title: '   ',
        time: '25:00',
        weekdays: [],
        startDate: '2026-02-30',
        imageUri: 'https://example.com/a.png',
        reminderAdvanceMinutes: -5,
      }),
    );
    expect(fields).toEqual([
      'title',
      'time',
      'weekdays',
      'startDate',
      'imageUri',
      'reminderAdvanceMinutes',
    ]);
  });

  it('requires a time', async () => {
    const { repo } = await setup();
    expect(await issuesOf(repo.createRoutine({ ...base, time: '' }))).toEqual(['time']);
  });

  it('edits only the fields given, keeping the rest', async () => {
    const { repo } = await setup();
    const routine = await repo.createRoutine(base);
    const edited = await repo.updateRoutine(routine.id, { time: '20:30', weekdays: [0, 6] });
    expect(edited).toMatchObject({ title: 'Brush teeth', time: '20:30', weekdays: [0, 6] });
    expect(edited.updatedAt).toBeGreaterThan(routine.updatedAt);
  });

  it('does not change a routine when an edit is invalid', async () => {
    const { repo } = await setup();
    const routine = await repo.createRoutine(base);
    expect(await issuesOf(repo.updateRoutine(routine.id, { weekdays: [] }))).toEqual(['weekdays']);
    expect(await repo.getRoutine(routine.id)).toEqual(routine);
  });

  it('pauses and resumes without changing the schedule', async () => {
    const { repo } = await setup();
    const routine = await repo.createRoutine(base);
    const paused = await repo.pauseRoutine(routine.id);
    expect(paused).toMatchObject({ paused: true, weekdays: [1, 3, 5], time: '21:00' });
    const resumed = await repo.resumeRoutine(routine.id);
    expect(resumed.paused).toBe(false);
  });

  it('lists active routines first, then by time', async () => {
    const { repo } = await setup();
    const late = await repo.createRoutine({ ...base, title: 'Late', time: '22:00' });
    const early = await repo.createRoutine({ ...base, title: 'Early', time: '07:00' });
    const paused = await repo.createRoutine({ ...base, title: 'Paused', time: '06:00' });
    await repo.pauseRoutine(paused.id);
    const list = await repo.listRoutines();
    expect(list.map((r) => r.id)).toEqual([early.id, late.id, paused.id]);
  });

  it('deletes a routine with its overrides', async () => {
    const { repo, raw } = await setup();
    const routine = await repo.createRoutine(base);
    raw
      .prepare(
        `INSERT INTO occurrence_overrides (id, routine_id, occurrence_date, status, created_at, updated_at)
         VALUES ('o1', ?, '2026-10-19', 'dismissed', 1, 1)`,
      )
      .run(routine.id);
    await repo.deleteRoutine(routine.id);
    expect(await repo.getRoutine(routine.id)).toBeNull();
    expect(raw.prepare('SELECT COUNT(*) AS n FROM occurrence_overrides').get()).toEqual({ n: 0 });
  });

  it('reports not_found for unknown ids', async () => {
    const { repo } = await setup();
    expect(await repo.getRoutine('nope')).toBeNull();
    for (const action of [
      () => repo.updateRoutine('nope', { title: 'x' }),
      () => repo.pauseRoutine('nope'),
      () => repo.resumeRoutine('nope'),
      () => repo.deleteRoutine('nope'),
    ]) {
      await expect(action()).rejects.toMatchObject({ code: 'not_found' });
      await expect(action()).rejects.toBeInstanceOf(StorageError);
    }
  });

  it('turns database failures into storage errors', async () => {
    const { repo, raw } = await setup();
    raw.exec('DROP TABLE routines');
    await expect(repo.createRoutine(base)).rejects.toMatchObject({ code: 'query_failed' });
  });

  describe('occurrence exceptions', () => {
    // 2026-10-19 is a Monday; base repeats Mon, Wed, Fri.
    const monday = '2026-10-19';
    const wednesday = '2026-10-21';

    it('stores a change for one day and leaves the routine and other days alone', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      const saved = await repo.saveOccurrence(routine.id, monday, {
        title: ' Brush and floss ',
        movedTime: '22:15',
      });
      expect(saved).toMatchObject({
        routineId: routine.id,
        occurrenceDate: monday,
        status: 'pending',
        title: 'Brush and floss',
        movedTime: '22:15',
        movedDate: null,
        notes: null,
      });
      expect(await repo.getRoutine(routine.id)).toEqual(routine);
      expect((await repo.listOccurrenceOverrides(routine.id)).map((o) => o.occurrenceDate)).toEqual(
        [monday],
      );
    });

    it('persists the choice: later saves update the same exception and keep other fields', async () => {
      const { repo, raw } = await setup();
      const routine = await repo.createRoutine(base);
      await repo.saveOccurrence(routine.id, monday, { title: 'A' });
      await repo.saveOccurrence(routine.id, monday, { notes: 'Bring water' });
      const rows = await repo.listOccurrenceOverrides(routine.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ title: 'A', notes: 'Bring water' });
      expect(raw.prepare('SELECT COUNT(*) AS n FROM occurrence_overrides').get()).toEqual({ n: 1 });
    });

    it('moves one occurrence to another date', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      const saved = await repo.saveOccurrence(routine.id, monday, { movedDate: '2026-10-20' });
      expect(saved).toMatchObject({ movedDate: '2026-10-20' });
    });

    it('dismisses and restores a day, recording when status changed', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      const dismissed = await repo.saveOccurrence(routine.id, monday, { status: 'dismissed' });
      expect(dismissed?.status).toBe('dismissed');
      const restored = await repo.saveOccurrence(routine.id, monday, { status: 'pending' });
      expect(restored).toBeNull();
      expect(await repo.listOccurrenceOverrides(routine.id)).toEqual([]);
    });

    it('removes the exception when every field is cleared back to the routine', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      await repo.saveOccurrence(routine.id, monday, { title: 'A', movedTime: '08:00' });
      const result = await repo.saveOccurrence(routine.id, monday, {
        title: null,
        movedTime: null,
      });
      expect(result).toBeNull();
      expect(await repo.listOccurrenceOverrides(routine.id)).toEqual([]);
    });

    it('clears an exception so the day follows the routine again', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      await repo.saveOccurrence(routine.id, monday, { title: 'A' });
      await repo.saveOccurrence(routine.id, wednesday, { title: 'B' });
      await repo.clearOccurrence(routine.id, monday);
      expect((await repo.listOccurrenceOverrides(routine.id)).map((o) => o.occurrenceDate)).toEqual(
        [wednesday],
      );
    });

    it('keeps exceptions when the series is edited', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      await repo.saveOccurrence(routine.id, monday, { title: 'Just today' });
      await repo.updateRoutine(routine.id, { time: '20:00', title: 'New name' });
      const [kept] = await repo.listOccurrenceOverrides(routine.id);
      expect(kept).toMatchObject({ occurrenceDate: monday, title: 'Just today', movedTime: null });
    });

    it('rejects days the routine does not generate', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      expect(await issuesOf(repo.saveOccurrence(routine.id, '2026-10-20', { title: 'x' }))).toEqual(
        ['occurrenceDate'],
      );
      expect(await issuesOf(repo.saveOccurrence(routine.id, '2026-10-12', { title: 'x' }))).toEqual(
        ['occurrenceDate'],
      );
      expect(await repo.listOccurrenceOverrides(routine.id)).toEqual([]);
    });

    it('reports every invalid field at once', async () => {
      const { repo } = await setup();
      const routine = await repo.createRoutine(base);
      expect(
        await issuesOf(
          repo.saveOccurrence(routine.id, monday, {
            title: '  ',
            movedTime: '25:00',
            movedDate: '2030-01-01',
          }),
        ),
      ).toEqual(['title', 'movedDate', 'movedTime']);
    });

    it('reports not_found for an unknown routine', async () => {
      const { repo } = await setup();
      await expect(repo.saveOccurrence('nope', monday, { title: 'x' })).rejects.toMatchObject({
        code: 'not_found',
      });
    });
  });
});
