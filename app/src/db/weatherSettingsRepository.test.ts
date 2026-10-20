import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrate } from './migrate';
import type { TaskDb } from './taskRepository';
import { createWeatherSettingsRepository } from './weatherSettingsRepository';

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
  return createWeatherSettingsRepository(adapt(raw), { now: () => 9 });
}

describe('weatherSettingsRepository', () => {
  it('starts with weather off and no location', async () => {
    const repo = await setup();
    expect(await repo.get()).toMatchObject({
      id: 1,
      mode: 'off',
      manual_label: null,
      manual_latitude: null,
      manual_longitude: null,
    });
  });

  it('stores a manual place, then device mode drops the place', async () => {
    const repo = await setup();
    await repo.setManual({ label: 'Oslo, Norway', latitude: 59.91, longitude: 10.75 });
    expect(await repo.get()).toMatchObject({
      mode: 'manual',
      manual_label: 'Oslo, Norway',
      manual_latitude: 59.91,
      manual_longitude: 10.75,
      updated_at: 9,
    });
    await repo.setDevice();
    expect(await repo.get()).toMatchObject({
      mode: 'device',
      manual_label: null,
      manual_latitude: null,
      manual_longitude: null,
    });
  });

  it('clear removes the saved place and coordinates', async () => {
    const repo = await setup();
    await repo.setManual({ label: 'Oslo', latitude: 59.91, longitude: 10.75 });
    await repo.clear();
    expect(await repo.get()).toMatchObject({
      mode: 'off',
      manual_label: null,
      manual_latitude: null,
    });
  });

  it('rejects out-of-range coordinates with a storage error', async () => {
    const repo = await setup();
    await expect(repo.setManual({ label: 'x', latitude: 120, longitude: 0 })).rejects.toThrow(
      /weather location/,
    );
  });
});
