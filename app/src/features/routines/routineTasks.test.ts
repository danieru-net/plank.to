import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrate } from '@/db/migrate';
import { createRoutineRepository } from '@/db/routineRepository';
import { createTaskRepository, type TaskDb } from '@/db/taskRepository';
import { createRoutineTasksForDate } from './routineTasks';

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
  const db = adapt(raw);
  return { tasks: createTaskRepository(db), routines: createRoutineRepository(db) };
}

// 2026-06-10 is a Wednesday (3); 2026-06-11 a Thursday (4).
describe('createRoutineTasksForDate', () => {
  it('creates a task only on the routine’s weekdays, with its details', async () => {
    const { tasks, routines } = await setup();
    await routines.createRoutine({
      title: 'Stretch',
      time: '07:30',
      weekdays: [3],
      startDate: '2026-06-01',
    });
    expect(await createRoutineTasksForDate(tasks, routines, '2026-06-11')).toBe(0);
    expect(await createRoutineTasksForDate(tasks, routines, '2026-06-10')).toBe(1);
    const [t] = await tasks.listTasksForDate('2026-06-10');
    expect(t).toMatchObject({ title: 'Stretch', time: '07:30', status: 'pending' });
    expect(t.routineId).not.toBeNull();
  });

  it('does not create the same task twice, even after it was moved to another day', async () => {
    const { tasks, routines } = await setup();
    await routines.createRoutine({
      title: 'Stretch',
      time: '07:30',
      weekdays: [3],
      startDate: '2026-06-01',
    });
    await createRoutineTasksForDate(tasks, routines, '2026-06-10');
    const [t] = await tasks.listTasksForDate('2026-06-10');
    await tasks.updateTask(t.id, { date: '2026-06-11' });
    expect(await createRoutineTasksForDate(tasks, routines, '2026-06-10')).toBe(0);
    expect(await tasks.listTasksForDate('2026-06-10')).toEqual([]);
  });

  it('skips paused routines', async () => {
    const { tasks, routines } = await setup();
    const r = await routines.createRoutine({
      title: 'Stretch',
      time: '07:30',
      weekdays: [3],
      startDate: '2026-06-01',
    });
    await routines.pauseRoutine(r.id);
    expect(await createRoutineTasksForDate(tasks, routines, '2026-06-10')).toBe(0);
  });
});
