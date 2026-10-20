import { DatabaseSync } from 'node:sqlite';

import { StorageError } from './errors';
import { getSchemaVersion, migrate, type MigrationDb } from './migrate';
import { migrations, SCHEMA_VERSION } from './schema';

function adapt(db: DatabaseSync): MigrationDb {
  return {
    execAsync: async (sql) => db.exec(sql),
    getFirstAsync: async <T>(sql: string) => (db.prepare(sql).get() as T | undefined) ?? null,
  };
}

function newDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  return { raw, db: adapt(raw) };
}

const count = (raw: DatabaseSync, table: string) =>
  (raw.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('migrate', () => {
  it('upgrades a new database to the latest version', async () => {
    const { db } = newDb();
    expect(await getSchemaVersion(db)).toBe(0);
    expect(await migrate(db)).toBe(SCHEMA_VERSION);
    expect(await getSchemaVersion(db)).toBe(SCHEMA_VERSION);
  });

  it('seeds clothing options and a weather row that is off', async () => {
    const { raw, db } = newDb();
    await migrate(db);
    expect(count(raw, 'clothing_options')).toBeGreaterThan(0);
    const w = raw.prepare('SELECT mode FROM weather_location_settings').all();
    expect(w).toEqual([{ mode: 'off' }]);
    const allowed = raw
      .prepare('SELECT count(*) AS n FROM clothing_options WHERE allowed = 1 AND excluded = 0')
      .get() as { n: number };
    expect(allowed.n).toBe(count(raw, 'clothing_options'));
  });

  it('is idempotent when run again', async () => {
    const { raw, db } = newDb();
    await migrate(db);
    const seeded = count(raw, 'clothing_options');
    await migrate(db);
    expect(count(raw, 'clothing_options')).toBe(seeded);
  });

  it('applies only pending migrations and keeps existing data', async () => {
    const { raw, db } = newDb();
    await migrate(db, migrations.slice(0, 1));
    expect(await getSchemaVersion(db)).toBe(1);
    raw.exec(
      "INSERT INTO tasks (id, title, date, created_at, updated_at) VALUES ('t1', 'Keep me', '2026-01-01', 1, 1)",
    );
    await migrate(db);
    expect(await getSchemaVersion(db)).toBe(SCHEMA_VERSION);
    expect(count(raw, 'tasks')).toBe(1);
  });

  it('rolls back a failing migration and reports a StorageError', async () => {
    const { raw, db } = newDb();
    await migrate(db, migrations.slice(0, 1));
    const bad = [
      ...migrations.slice(0, 1),
      {
        version: 2,
        description: 'bad',
        statements: ['CREATE TABLE half_done (id TEXT)', 'THIS IS NOT SQL'],
      },
    ];
    await expect(migrate(db, bad)).rejects.toMatchObject({ code: 'migration_failed' });
    await expect(migrate(db, bad)).rejects.toBeInstanceOf(StorageError);
    expect(await getSchemaVersion(db)).toBe(1);
    const t = raw.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").all();
    expect(t).toHaveLength(0);
  });

  it('refuses a database from a newer app version', async () => {
    const { raw, db } = newDb();
    raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toMatchObject({ code: 'unsupported_version' });
  });
});
