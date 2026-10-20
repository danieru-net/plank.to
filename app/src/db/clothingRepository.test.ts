import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { createClothingRepository } from './clothingRepository';
import { migrate } from './migrate';
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
  return createClothingRepository(adapt(raw), { now: () => 42 });
}

describe('clothingRepository', () => {
  it('lists the 18 seeded options, all allowed and none excluded', async () => {
    const repo = await setup();
    const rows = await repo.list();
    expect(rows).toHaveLength(18);
    expect(rows.every((r) => r.allowed === 1 && r.excluded === 0)).toBe(true);
  });

  it('changes allowed and excluded for one option only', async () => {
    const repo = await setup();
    await repo.setAllowed('skirt', false);
    await repo.setExcluded('boots', true);
    const rows = await repo.list();
    expect(rows.find((r) => r.id === 'skirt')).toMatchObject({
      allowed: 0,
      excluded: 0,
      updated_at: 42,
    });
    expect(rows.find((r) => r.id === 'boots')).toMatchObject({ allowed: 1, excluded: 1 });
    expect(rows.find((r) => r.id === 'dress')).toMatchObject({ allowed: 1, excluded: 0 });
  });

  it('resets everything to the defaults', async () => {
    const repo = await setup();
    await repo.setAllowed('skirt', false);
    await repo.setExcluded('boots', true);
    await repo.reset();
    const rows = await repo.list();
    expect(rows.every((r) => r.allowed === 1 && r.excluded === 0)).toBe(true);
  });
});
