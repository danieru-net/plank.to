import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrate } from './migrate';
import { createPreferenceRepository } from './preferenceRepository';
import type { TaskDb } from './taskRepository';

function adapt(raw: DatabaseSync): TaskDb {
  const p = (params?: (string | number | null)[]) => (params ?? []) as SQLInputValue[];
  return {
    runAsync: async (sql, params) => raw.prepare(sql).run(...p(params)),
    getFirstAsync: async <T>(sql: string, params?: (string | number | null)[]) =>
      (raw.prepare(sql).get(...p(params)) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, params?: (string | number | null)[]) =>
      raw.prepare(sql).all(...p(params)) as T[],
    withTransactionAsync: async (task) => task(),
  };
}

async function setup() {
  const raw = new DatabaseSync(':memory:');
  await migrate({
    execAsync: async (sql) => raw.exec(sql),
    getFirstAsync: async <T>(sql: string) => (raw.prepare(sql).get() as T | undefined) ?? null,
  });
  return { raw, repo: createPreferenceRepository(adapt(raw), { now: () => 5 }) };
}

describe('preferenceRepository', () => {
  it('starts empty, then stores and overwrites values', async () => {
    const { repo } = await setup();
    expect(await repo.getAll()).toEqual({});
    await repo.set('display.textScale', 1.3);
    await repo.set('display.density', 'compact');
    await repo.set('display.textScale', 1.5);
    expect(await repo.getAll()).toEqual({
      'display.textScale': 1.5,
      'display.density': 'compact',
    });
  });

  it('removes a value and skips corrupt JSON', async () => {
    const { raw, repo } = await setup();
    await repo.set('display.density', 'compact');
    raw
      .prepare('INSERT INTO preferences (key, value, created_at, updated_at) VALUES (?,?,1,1)')
      .run('display.colorTheme', '{not json');
    expect(await repo.getAll()).toEqual({ 'display.density': 'compact' });
    await repo.remove('display.density');
    expect(await repo.getAll()).toEqual({});
  });
});
