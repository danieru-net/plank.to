import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrate } from './migrate';
import type { TaskDb } from './taskRepository';
import { createForecastCacheRepository } from './forecastCacheRepository';
import { createPreferenceRepository } from './preferenceRepository';

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
  const db = adapt(raw);
  return {
    cache: createForecastCacheRepository(db, { now: () => 9 }),
    prefs: createPreferenceRepository(db),
  };
}

describe('forecastCacheRepository', () => {
  it('starts empty, saves one forecast, and clears it', async () => {
    const { cache, prefs } = await setup();
    expect(await cache.load()).toBeNull();
    await prefs.set('weather.enabled', true);
    await cache.save({ fetchedAt: 1 } as never);
    await cache.save({ fetchedAt: 2 } as never);
    expect(await cache.load()).toEqual({ fetchedAt: 2 });
    await cache.clear();
    expect(await cache.load()).toBeNull();
    expect((await prefs.getAll())['weather.enabled']).toBe(true);
  });
});
