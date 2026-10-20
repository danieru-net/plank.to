import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { StorageError, ValidationError } from './errors';
import { migrate } from './migrate';
import { createTaskRepository, type TaskDb } from './taskRepository';

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
  const repo = createTaskRepository(adapt(raw), {
    newId: () => `id-${++n}`,
    now: () => (clock += 10),
  });
  return { raw, repo };
}

const base = { title: 'Shower', date: '2026-10-19' };

async function issuesOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    return (e as ValidationError).issues.map((i) => i.field);
  }
  throw new Error('expected a ValidationError');
}

describe('task repository', () => {
  it('creates a task with defaults and reads it back', async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ ...base, title: '  Shower  ' });
    expect(task).toMatchObject({
      title: 'Shower',
      date: '2026-10-19',
      time: null,
      notes: null,
      status: 'pending',
      reminderEnabled: false,
      reminderAdvanceMinutes: 0,
      steps: [],
    });
    expect(await repo.getTask(task.id)).toEqual(task);
  });

  it('stores optional fields and ordered steps, ignoring blank steps', async () => {
    const { repo } = await setup();
    const task = await repo.createTask({
      ...base,
      time: '19:00',
      notes: ' warm water ',
      symbol: 'shower',
      imageUri: 'file:///a.png',
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
      steps: ['Towel', '  ', 'Soap'],
    });
    expect(task).toMatchObject({
      time: '19:00',
      notes: 'warm water',
      symbol: 'shower',
      imageUri: 'file:///a.png',
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
    });
    expect(task.steps.map((s) => s.title)).toEqual(['Towel', 'Soap']);
  });

  it('rejects invalid input with a message per field and saves nothing', async () => {
    const { raw, repo } = await setup();
    expect(await issuesOf(repo.createTask({ ...base, title: '   ' }))).toEqual(['title']);
    expect(await issuesOf(repo.createTask({ ...base, title: 'x'.repeat(201) }))).toEqual(['title']);
    expect(await issuesOf(repo.createTask({ ...base, date: '2026-02-30' }))).toEqual(['date']);
    expect(await issuesOf(repo.createTask({ ...base, date: '' }))).toEqual(['date']);
    expect(await issuesOf(repo.createTask({ ...base, time: '24:00' }))).toEqual(['time']);
    expect(await issuesOf(repo.createTask({ ...base, time: '7pm' }))).toEqual(['time']);
    expect(await issuesOf(repo.createTask({ ...base, reminderAdvanceMinutes: -1 }))).toEqual([
      'reminderAdvanceMinutes',
    ]);
    expect(await issuesOf(repo.createTask({ ...base, steps: Array(51).fill('s') }))).toEqual([
      'steps',
    ]);
    expect(await issuesOf(repo.createTask({ title: '', date: 'bad', time: 'bad' }))).toEqual([
      'title',
      'date',
      'time',
    ]);
    expect(raw.prepare('SELECT count(*) AS n FROM tasks').get()).toEqual({ n: 0 });
  });

  it('accepts only local image references and can remove one', async () => {
    const { repo } = await setup();
    expect(await issuesOf(repo.createTask({ ...base, imageUri: 'https://x.test/a.png' }))).toEqual([
      'imageUri',
    ]);
    const task = await repo.createTask({ ...base, imageUri: ' file:///a.png ' });
    expect(task.imageUri).toBe('file:///a.png');
    expect((await repo.updateTask(task.id, { title: 'Bath' })).imageUri).toBe('file:///a.png');
    expect((await repo.updateTask(task.id, { imageUri: null })).imageUri).toBeNull();
  });

  it('treats a blank time as untimed', async () => {
    const { repo } = await setup();
    expect((await repo.createTask({ ...base, time: '' })).time).toBeNull();
  });

  it('updates only the given fields and bumps updated_at', async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ ...base, time: '19:00', steps: ['a'] });
    const updated = await repo.updateTask(task.id, { title: 'Bath', notes: 'later' });
    expect(updated).toMatchObject({ title: 'Bath', notes: 'later', time: '19:00' });
    expect(updated.steps.map((s) => s.title)).toEqual(['a']);
    expect(updated.updatedAt).toBeGreaterThan(task.updatedAt);
    expect(updated.createdAt).toBe(task.createdAt);
  });

  it('can clear optional fields and replace steps', async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ ...base, time: '19:00', notes: 'n', steps: ['a', 'b'] });
    const updated = await repo.updateTask(task.id, { time: null, notes: null, steps: ['c'] });
    expect(updated.time).toBeNull();
    expect(updated.notes).toBeNull();
    expect(updated.steps.map((s) => s.title)).toEqual(['c']);
  });

  it('rejects an invalid update and leaves the task unchanged', async () => {
    const { repo } = await setup();
    const task = await repo.createTask({ ...base, steps: ['a'] });
    expect(await issuesOf(repo.updateTask(task.id, { title: '', steps: ['z'] }))).toEqual([
      'title',
    ]);
    expect(await repo.getTask(task.id)).toEqual(task);
  });

  it('completes, dismisses, and reopens a task', async () => {
    const { repo } = await setup();
    const task = await repo.createTask(base);
    const done = await repo.completeTask(task.id);
    expect(done.status).toBe('completed');
    expect(done.statusChangedAt).not.toBeNull();
    expect((await repo.dismissTask(task.id)).status).toBe('dismissed');
    const reopened = await repo.reopenTask(task.id);
    expect(reopened.status).toBe('pending');
    expect(reopened.statusChangedAt).toBeNull();
  });

  it('deletes a task and its steps', async () => {
    const { raw, repo } = await setup();
    const task = await repo.createTask({ ...base, steps: ['a', 'b'] });
    await repo.deleteTask(task.id);
    expect(await repo.getTask(task.id)).toBeNull();
    expect(raw.prepare('SELECT count(*) AS n FROM steps').get()).toEqual({ n: 0 });
  });

  it('reports not_found for unknown ids', async () => {
    const { repo } = await setup();
    expect(await repo.getTask('nope')).toBeNull();
    for (const op of [
      () => repo.updateTask('nope', { title: 'x' }),
      () => repo.completeTask('nope'),
      () => repo.dismissTask('nope'),
      () => repo.deleteTask('nope'),
    ]) {
      await expect(op()).rejects.toMatchObject({ code: 'not_found' });
      await expect(op()).rejects.toBeInstanceOf(StorageError);
    }
  });

  it('lists a day: timed in order, then untimed, other days excluded', async () => {
    const { repo } = await setup();
    await repo.createTask({ ...base, title: 'untimed 1' });
    await repo.createTask({ ...base, title: 'evening', time: '19:00', steps: ['s'] });
    await repo.createTask({ ...base, title: 'morning', time: '07:30' });
    await repo.createTask({ ...base, title: 'untimed 2' });
    await repo.createTask({ ...base, title: 'tomorrow', date: '2026-10-20' });
    const list = await repo.listTasksForDate('2026-10-19');
    expect(list.map((t) => t.title)).toEqual(['morning', 'evening', 'untimed 1', 'untimed 2']);
    expect(list[1].steps).toHaveLength(1);
    expect(await repo.listTasksForDate('2026-10-21')).toEqual([]);
    expect(await issuesOf(repo.listTasksForDate('nope'))).toEqual(['date']);
  });

  it('wraps database failures as query_failed', async () => {
    const failing = createTaskRepository({
      runAsync: async () => {
        throw new Error('disk full');
      },
      getFirstAsync: async () => {
        throw new Error('disk full');
      },
      getAllAsync: async () => [],
      withTransactionAsync: async (task) => task(),
    });
    await expect(failing.createTask(base)).rejects.toMatchObject({ code: 'query_failed' });
    await expect(failing.getTask('x')).rejects.toMatchObject({ code: 'query_failed' });
  });
});
