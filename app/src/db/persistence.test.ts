import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { createClothingRepository } from './clothingRepository';
import { getSchemaVersion, migrate, type MigrationDb } from './migrate';
import { createPreferenceRepository } from './preferenceRepository';
import { createRoutineRepository } from './routineRepository';
import { migrations, SCHEMA_VERSION } from './schema';
import { createTaskRepository, type TaskDb } from './taskRepository';
import { createWeatherSettingsRepository } from './weatherSettingsRepository';

/**
 * File-backed tests: "restarting the app" is closing a node:sqlite database and opening the same
 * file again, which is what expo-sqlite does with plank.db on a real device.
 */

let dir: string;
let file: string;
const open: DatabaseSync[] = [];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'plank-db-'));
  file = join(dir, 'plank.db');
});

afterEach(() => {
  for (const db of open.splice(0)) {
    try {
      db.close();
    } catch {
      // already closed by the test
    }
  }
  rmSync(dir, { recursive: true, force: true });
});

/** Same pragmas as initializeDatabase (WAL, foreign keys), then migrate. */
function openFile(): DatabaseSync {
  const raw = new DatabaseSync(file);
  open.push(raw);
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return raw;
}

const migrationDb = (raw: DatabaseSync): MigrationDb => ({
  execAsync: async (sql) => raw.exec(sql),
  getFirstAsync: async <T>(sql: string) => (raw.prepare(sql).get() as T | undefined) ?? null,
});

function taskDb(raw: DatabaseSync): TaskDb {
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

async function launch() {
  const raw = openFile();
  const version = await migrate(migrationDb(raw));
  const db = taskDb(raw);
  return {
    raw,
    version,
    tasks: createTaskRepository(db),
    routines: createRoutineRepository(db),
    prefs: createPreferenceRepository(db),
    clothing: createClothingRepository(db),
    weather: createWeatherSettingsRepository(db),
  };
}

function quit(raw: DatabaseSync) {
  raw.close();
  open.splice(open.indexOf(raw), 1);
}

const count = (raw: DatabaseSync, table: string) =>
  (raw.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('database initialization on a file', () => {
  it('creates the file at the latest version with seeded defaults and foreign keys on', async () => {
    const app = await launch();
    expect(app.version).toBe(SCHEMA_VERSION);
    expect(count(app.raw, 'clothing_options')).toBeGreaterThan(0);
    expect(await app.weather.get()).toMatchObject({ mode: 'off', manual_label: null });
    expect(await app.tasks.listTasksForDate('2026-10-19')).toEqual([]);
    expect(await app.routines.listRoutines()).toEqual([]);
    expect(await app.prefs.getAll()).toEqual({});
    expect(app.raw.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    expect(app.raw.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
  });

  it('does not reseed or reset anything when opened again', async () => {
    const first = await launch();
    await first.clothing.setExcluded('umbrella', true);
    const seeded = count(first.raw, 'clothing_options');
    quit(first.raw);
    const second = await launch();
    expect(count(second.raw, 'clothing_options')).toBe(seeded);
    const umbrella = (await second.clothing.list()).find((o) => o.id === 'umbrella');
    expect(umbrella?.excluded).toBe(1);
    expect(count(second.raw, 'weather_location_settings')).toBe(1);
  });
});

describe('upgrade from an earlier schema version with data present', () => {
  // Every released version before the latest. Add the next version's fixture here when a
  // migration is added (see seedVersion below).
  const priorVersions = migrations.slice(0, -1).map((m) => m.version);

  function seedVersion(raw: DatabaseSync, version: number) {
    // Rows valid at version 1 (the tables exist from the first migration on).
    expect(version).toBeGreaterThanOrEqual(1);
    raw.exec(`
      INSERT INTO tasks (id, title, notes, date, time, status, status_changed_at, reminder_enabled, reminder_advance_minutes, created_at, updated_at)
        VALUES ('t1', 'Pack bag', 'Blue one', '2026-10-19', '07:30', 'completed', 5, 1, 10, 1, 2),
               ('t2', 'Untimed', NULL, '2026-10-19', NULL, 'pending', NULL, 0, 0, 1, 1);
      INSERT INTO routines (id, title, time, weekdays, start_date, paused, created_at, updated_at)
        VALUES ('r1', 'Brush teeth', '21:00', 42, '2026-10-01', 1, 1, 1);
      INSERT INTO steps (id, task_id, routine_id, position, title, created_at, updated_at)
        VALUES ('s1', 't1', NULL, 0, 'Lunch', 1, 1), ('s2', NULL, 'r1', 0, 'Floss', 1, 1);
      INSERT INTO occurrence_overrides (id, routine_id, occurrence_date, status, moved_time, created_at, updated_at)
        VALUES ('o1', 'r1', '2026-10-05', 'dismissed', '22:00', 1, 1);
      INSERT INTO preferences (key, value, created_at, updated_at)
        VALUES ('display.textScale', '1.5', 1, 1);
    `);
  }

  it.each(priorVersions)('from v%i: keeps every row and reaches the latest version', async (v) => {
    const raw = openFile();
    await migrate(migrationDb(raw), migrations.slice(0, v));
    expect(await getSchemaVersion(migrationDb(raw))).toBe(v);
    seedVersion(raw, v);
    quit(raw);

    const app = await launch(); // the new app version opens the old file
    expect(app.version).toBe(SCHEMA_VERSION);
    expect(await getSchemaVersion(migrationDb(app.raw))).toBe(SCHEMA_VERSION);

    expect(await app.tasks.getTask('t1')).toMatchObject({
      title: 'Pack bag',
      notes: 'Blue one',
      time: '07:30',
      status: 'completed',
      reminderEnabled: true,
      reminderAdvanceMinutes: 10,
    });
    expect(await app.tasks.listTasksForDate('2026-10-19')).toHaveLength(2);
    expect(await app.routines.getRoutine('r1')).toMatchObject({
      title: 'Brush teeth',
      weekdays: [1, 3, 5],
      paused: true,
    });
    expect(await app.routines.listOccurrenceOverrides('r1')).toEqual([
      expect.objectContaining({ occurrenceDate: '2026-10-05', status: 'dismissed' }),
    ]);
    expect(await app.prefs.getAll()).toEqual({ 'display.textScale': 1.5 });
    // Steps from older versions are dropped with their table.
    expect(app.raw.prepare("SELECT name FROM sqlite_master WHERE name = 'steps'").all()).toEqual(
      [],
    );

    // Later migrations' seeds are present and the app can keep writing.
    expect(await app.weather.get()).toMatchObject({ mode: 'off' });
    expect((await app.clothing.list()).length).toBeGreaterThan(0);
    await app.tasks.createTask({ title: 'New after upgrade', date: '2026-10-20' });
    expect(count(app.raw, 'tasks')).toBe(3);
  });

  it('upgrading twice (reopening after the upgrade) changes nothing more', async () => {
    const raw = openFile();
    await migrate(migrationDb(raw), migrations.slice(0, 1));
    seedVersion(raw, 1);
    quit(raw);
    const first = await launch();
    const before = first.raw.prepare('SELECT * FROM clothing_options ORDER BY id').all();
    quit(first.raw);
    const second = await launch();
    expect(second.raw.prepare('SELECT * FROM clothing_options ORDER BY id').all()).toEqual(before);
    expect(count(second.raw, 'tasks')).toBe(2);
  });

  it('a failed upgrade leaves the file at the old version with its data, and a retry works', async () => {
    const raw = openFile();
    await migrate(migrationDb(raw), migrations.slice(0, 1));
    seedVersion(raw, 1);
    const bad = [
      ...migrations.slice(0, 1),
      {
        version: 2,
        description: 'bad',
        statements: ['ALTER TABLE tasks ADD COLUMN extra TEXT', 'NOT SQL'],
      },
    ];
    await expect(migrate(migrationDb(raw), bad)).rejects.toMatchObject({
      code: 'migration_failed',
    });
    quit(raw);

    const reopened = openFile();
    expect(await getSchemaVersion(migrationDb(reopened))).toBe(1);
    const cols = reopened.prepare('PRAGMA table_info(tasks)').all();
    expect(cols.map((c) => c.name)).not.toContain('extra');
    expect(count(reopened, 'tasks')).toBe(2);
    quit(reopened);

    const app = await launch();
    expect(app.version).toBe(SCHEMA_VERSION);
    expect(count(app.raw, 'tasks')).toBe(2);
  });

  it('refuses a file saved by a newer app and leaves it untouched', async () => {
    const raw = openFile();
    await migrate(migrationDb(raw));
    raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    raw.exec(
      "INSERT INTO tasks (id, title, date, created_at, updated_at) VALUES ('t1', 'Keep', '2026-01-01', 1, 1)",
    );
    quit(raw);
    const again = openFile();
    await expect(migrate(migrationDb(again))).rejects.toMatchObject({
      code: 'unsupported_version',
    });
    expect(await getSchemaVersion(migrationDb(again))).toBe(SCHEMA_VERSION + 1);
    expect(count(again, 'tasks')).toBe(1);
  });
});

describe('persistence after restart', () => {
  it('keeps tasks: create, update, complete, delete', async () => {
    const a = await launch();
    const keep = await a.tasks.createTask({
      title: 'Walk',
      date: '2026-10-19',
      time: '08:00',
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
    });
    const done = await a.tasks.createTask({ title: 'Email', date: '2026-10-19' });
    const gone = await a.tasks.createTask({ title: 'Remove me', date: '2026-10-19' });
    await a.tasks.updateTask(keep.id, { title: 'Walk the dog' });
    await a.tasks.completeTask(done.id);
    await a.tasks.deleteTask(gone.id);
    quit(a.raw);

    const b = await launch();
    const day = await b.tasks.listTasksForDate('2026-10-19');
    expect(day.map((t) => t.title)).toEqual(['Walk the dog', 'Email']);
    expect(await b.tasks.getTask(keep.id)).toMatchObject({
      time: '08:00',
      reminderEnabled: true,
      reminderAdvanceMinutes: 15,
    });
    expect((await b.tasks.getTask(done.id))?.status).toBe('completed');
    expect(await b.tasks.getTask(gone.id)).toBeNull();
  });

  it('keeps routines, single-day exceptions, pause state, and cascading deletes', async () => {
    const a = await launch();
    const daily = await a.routines.createRoutine({
      title: 'Shower',
      time: '19:00',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-10-01',
    });
    const doomed = await a.routines.createRoutine({
      title: 'Doomed',
      time: '06:00',
      weekdays: [1],
      startDate: '2026-10-01',
    });
    await a.routines.saveOccurrence(daily.id, '2026-10-20', { movedTime: '20:30' });
    await a.routines.saveOccurrence(doomed.id, '2026-10-19', { status: 'dismissed' });
    await a.routines.pauseRoutine(daily.id);
    await a.routines.deleteRoutine(doomed.id);
    quit(a.raw);

    const b = await launch();
    expect((await b.routines.listRoutines()).map((r) => r.title)).toEqual(['Shower']);
    expect(await b.routines.getRoutine(daily.id)).toMatchObject({
      paused: true,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(await b.routines.listOccurrenceOverrides(daily.id)).toEqual([
      expect.objectContaining({ occurrenceDate: '2026-10-20', movedTime: '20:30' }),
    ]);
    expect(count(b.raw, 'occurrence_overrides')).toBe(1);
    await b.routines.resumeRoutine(daily.id);
    quit(b.raw);
    const c = await launch();
    expect((await c.routines.getRoutine(daily.id))?.paused).toBe(false);
  });

  it('keeps preferences, clothing choices, and weather settings, including clearing', async () => {
    const a = await launch();
    await a.prefs.set('display.textScale', 1.3);
    await a.prefs.set('display.density', 'compact');
    await a.prefs.remove('display.density');
    await a.clothing.setAllowed('shorts', false);
    await a.clothing.setExcluded('scarf', true);
    await a.weather.setManual({ label: 'Leeds', latitude: 53.8, longitude: -1.55 });
    quit(a.raw);

    const b = await launch();
    expect(await b.prefs.getAll()).toEqual({ 'display.textScale': 1.3 });
    const options = await b.clothing.list();
    expect(options.find((o) => o.id === 'shorts')?.allowed).toBe(0);
    expect(options.find((o) => o.id === 'scarf')?.excluded).toBe(1);
    expect(await b.weather.get()).toMatchObject({
      mode: 'manual',
      manual_label: 'Leeds',
      manual_latitude: 53.8,
      manual_longitude: -1.55,
    });
    await b.weather.clear();
    await b.clothing.reset();
    quit(b.raw);

    const c = await launch();
    expect(await c.weather.get()).toMatchObject({
      mode: 'off',
      manual_label: null,
      manual_latitude: null,
      manual_longitude: null,
    });
    expect((await c.clothing.list()).every((o) => o.allowed === 1 && o.excluded === 0)).toBe(true);
  });

  it('does not keep a write that failed validation or a rolled-back transaction', async () => {
    const a = await launch();
    await expect(a.tasks.createTask({ title: '   ', date: '2026-10-19' })).rejects.toBeTruthy();
    await expect(
      a.tasks.createTask({ title: 'Bad time', date: '2026-10-19', time: '7:5' }),
    ).rejects.toBeTruthy();
    a.raw.exec('BEGIN');
    a.raw.exec(
      "INSERT INTO tasks (id, title, date, created_at, updated_at) VALUES ('x', 'Half', '2026-10-19', 1, 1)",
    );
    a.raw.exec('ROLLBACK');
    quit(a.raw);
    const b = await launch();
    expect(count(b.raw, 'tasks')).toBe(0);
  });

  it('survives many restarts without duplicating rows or bumping the version', async () => {
    let id = '';
    for (let i = 0; i < 4; i++) {
      const app = await launch();
      if (i === 0) id = (await app.tasks.createTask({ title: 'Once', date: '2026-10-19' })).id;
      expect(app.version).toBe(SCHEMA_VERSION);
      expect(count(app.raw, 'tasks')).toBe(1);
      expect(count(app.raw, 'weather_location_settings')).toBe(1);
      expect((await app.tasks.getTask(id))?.title).toBe('Once');
      quit(app.raw);
    }
  });
});
