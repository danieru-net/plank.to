import { DatabaseSync } from 'node:sqlite';
import { migrations, SCHEMA_VERSION, TABLE_NAMES } from './schema';

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const m of migrations) for (const sql of m.statements) db.exec(sql);
  return db;
}

const NOW = 1_700_000_000_000;

describe('migrations', () => {
  it('have contiguous versions starting at 1', () => {
    migrations.forEach((m, i) => expect(m.version).toBe(i + 1));
    expect(SCHEMA_VERSION).toBe(migrations.length);
  });

  it('apply cleanly and create every table', () => {
    const db = freshDb();
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((r) => r.name as string);
    for (const t of TABLE_NAMES) expect(names).toContain(t);
  });

  it('give every table created_at and updated_at', () => {
    const db = freshDb();
    for (const t of TABLE_NAMES) {
      const cols = db
        .prepare(`PRAGMA table_info(${t})`)
        .all()
        .map((c) => c.name);
      expect(cols).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    }
  });
});

describe('constraints', () => {
  const insertRoutine = (db: DatabaseSync, id: string, weekdays: number) =>
    db
      .prepare(
        `INSERT INTO routines (id, title, time, weekdays, start_date, created_at, updated_at)
         VALUES (?, 'Shower', '19:00', ?, '2026-01-01', ?, ?)`,
      )
      .run(id, weekdays, NOW, NOW);

  it('accepts a daily routine and rejects empty or out-of-range weekdays', () => {
    const db = freshDb();
    expect(() => insertRoutine(db, 'r1', 127)).not.toThrow();
    expect(() => insertRoutine(db, 'r2', 0)).toThrow();
    expect(() => insertRoutine(db, 'r3', 128)).toThrow();
  });

  it('rejects blank titles and malformed times', () => {
    const db = freshDb();
    const task = (title: string, time: string | null) =>
      db
        .prepare(
          `INSERT INTO tasks (id, title, date, time, created_at, updated_at)
           VALUES (hex(randomblob(4)), ?, '2026-01-01', ?, ?, ?)`,
        )
        .run(title, time, NOW, NOW);
    expect(() => task('Walk', null)).not.toThrow();
    expect(() => task('Walk', '07:30')).not.toThrow();
    expect(() => task('   ', null)).toThrow();
    expect(() => task('Walk', '7:30')).toThrow();
  });

  it('allows one override per routine occurrence and cascades on delete', () => {
    const db = freshDb();
    insertRoutine(db, 'r1', 127);
    const override = () =>
      db
        .prepare(
          `INSERT INTO occurrence_overrides (id, routine_id, occurrence_date, status, created_at, updated_at)
           VALUES (hex(randomblob(4)), 'r1', '2026-02-01', 'dismissed', ?, ?)`,
        )
        .run(NOW, NOW);
    override();
    expect(override).toThrow();
    db.exec("DELETE FROM routines WHERE id = 'r1'");
    expect(db.prepare('SELECT count(*) AS n FROM occurrence_overrides').get()?.n).toBe(0);
  });

  it('requires a step to belong to exactly one parent', () => {
    const db = freshDb();
    insertRoutine(db, 'r1', 127);
    const step = (task: string | null, routine: string | null) =>
      db
        .prepare(
          `INSERT INTO steps (id, task_id, routine_id, position, title, created_at, updated_at)
           VALUES (hex(randomblob(4)), ?, ?, 0, 'Soap', ?, ?)`,
        )
        .run(task, routine, NOW, NOW);
    expect(() => step(null, 'r1')).not.toThrow();
    expect(() => step(null, null)).toThrow();
  });

  it('keeps weather settings to a single row and requires coordinates for manual mode', () => {
    const db = freshDb();
    const insert = (id: number, mode: string, lat: number | null, lon: number | null) =>
      db
        .prepare(
          `INSERT INTO weather_location_settings
             (id, mode, manual_latitude, manual_longitude, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(id, mode, lat, lon, NOW, NOW);
    expect(() => insert(2, 'off', null, null)).toThrow();
    // Row 1 is seeded by migration 2, so use updates for the manual-mode checks.
    expect(() => insert(1, 'off', null, null)).toThrow();
    const setManual = (lat: number | null, lon: number | null) =>
      db
        .prepare(
          `UPDATE weather_location_settings
           SET mode = 'manual', manual_latitude = ?, manual_longitude = ? WHERE id = 1`,
        )
        .run(lat, lon);
    expect(() => setManual(null, null)).toThrow();
    expect(() => setManual(51.5, -0.12)).not.toThrow();
  });
});
