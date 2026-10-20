import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { createClothingRepository } from '@/db/clothingRepository';
import { migrate, type MigrationDb } from '@/db/migrate';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { createRoutineRepository } from '@/db/routineRepository';
import { createTaskRepository, type TaskDb } from '@/db/taskRepository';
import { createWeatherSettingsRepository } from '@/db/weatherSettingsRepository';
import { fetchForecast } from '@/features/weather/forecast';
import { searchPlaces } from '@/features/weather/geocoding';
import { parseScenario, resetAndSeed, resetData, seedData } from './seed';
import { parseNetworkMode, setStubNetworkMode, stubFetch, weatherFetch } from './stubFetch';
import { TEST_MODE } from './testMode';

function open() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  const p = (params?: (string | number | null)[]) => (params ?? []) as SQLInputValue[];
  const db: TaskDb = {
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
  const mdb: MigrationDb = {
    execAsync: async (sql) => raw.exec(sql),
    getFirstAsync: async <T>(sql: string) => (raw.prepare(sql).get() as T | undefined) ?? null,
  };
  return { db, mdb };
}

describe('test mode gating', () => {
  it('is off unless explicitly enabled, and weather uses the real fetch', () => {
    expect(TEST_MODE).toBe(false);
    expect(weatherFetch()).toBe(fetch);
  });
});

describe('stubbed weather', () => {
  it('serves the same forecast and places with no network and blocks other hosts', async () => {
    const forecast = await fetchForecast(
      { latitude: 51.51, longitude: -0.13 },
      { fetchImpl: stubFetch },
    );
    expect(forecast.current.temperature).toBe(12);
    expect(forecast.daily[0].temperatureMax).toBe(14);
    expect(forecast.daily[0].precipitationProbabilityMax).toBe(70);
    const places = await searchPlaces('Testville', stubFetch);
    expect(places[0]).toMatchObject({ latitude: 51.51, longitude: -0.13 });
    await expect(stubFetch('https://example.com/')).rejects.toThrow('blocks network');
  });
});

describe('stubbed network modes', () => {
  afterEach(() => setStubNetworkMode('ok'));

  it('parses modes with a safe default', () => {
    expect(parseNetworkMode('offline')).toBe('offline');
    expect(parseNetworkMode('nonsense')).toBe('ok');
  });

  it('maps offline to a network error and error to a provider error', async () => {
    const place = { latitude: 51.51, longitude: -0.13 };
    setStubNetworkMode('offline');
    await expect(fetchForecast(place, { fetchImpl: stubFetch })).rejects.toMatchObject({
      kind: 'network',
    });
    setStubNetworkMode('error');
    await expect(fetchForecast(place, { fetchImpl: stubFetch })).rejects.toMatchObject({
      kind: 'provider',
    });
  });
});

describe('seed and reset', () => {
  const today = new Date(2026, 5, 10, 12, 0);

  it('parses scenarios with a safe default', () => {
    expect(parseScenario('empty')).toBe('empty');
    expect(parseScenario('nonsense')).toBe('seeded');
  });

  it('seeds fixed tasks, routines, and preferences, and resets back to first run', async () => {
    const { db, mdb } = open();
    await migrate(mdb);
    await seedData(db, 'seeded-weather', today);

    const tasks = await createTaskRepository(db).listTasksForDate('2026-06-10');
    expect(tasks.map((t) => t.title).sort()).toEqual([
      'Seed: Call the dentist',
      'Seed: Pack gym bag',
      'Seed: Pay rent',
    ]);
    expect((await createRoutineRepository(db).listRoutines()).map((r) => r.title).sort()).toEqual([
      'Seed: Morning stretch',
      'Seed: Weekday standup',
    ]);
    const prefs = await createPreferenceRepository(db).getAll();
    expect(prefs['weather.enabled']).toBe(true);
    expect((await createWeatherSettingsRepository(db).get())?.mode).toBe('manual');

    const clothing = createClothingRepository(db);
    await db.runAsync('UPDATE clothing_options SET excluded = 1 WHERE id = ?', ['shorts']);
    await resetData(db);
    expect(await createTaskRepository(db).listTasksForDate('2026-06-10')).toEqual([]);
    expect(await createRoutineRepository(db).listRoutines()).toEqual([]);
    expect(await createPreferenceRepository(db).getAll()).toEqual({});
    expect((await createWeatherSettingsRepository(db).get())?.mode).toBe('off');
    expect((await clothing.list()).every((o) => o.allowed && !o.excluded)).toBe(true);
  });

  it('is repeatable: seeding twice gives the same data, not duplicates', async () => {
    const { db, mdb } = open();
    await migrate(mdb);
    await resetAndSeed(db, 'seeded');
    await resetAndSeed(db, 'seeded');
    expect((await createRoutineRepository(db).listRoutines()).length).toBe(2);
    expect((await createPreferenceRepository(db).getAll())['weather.enabled']).toBeUndefined();
  });
});
