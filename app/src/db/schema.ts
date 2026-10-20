/**
 * Versioned local SQLite schema. Migrations are append-only: never edit a released
 * migration, add a new one. The applied version is stored in `PRAGMA user_version`.
 * migrate.ts runs them.
 *
 * Conventions:
 * - IDs are app-generated UUID strings (stable across restarts, safe to use in notification IDs).
 * - Timestamps are UTC epoch milliseconds (INTEGER). `created_at` and `updated_at` on every table.
 * - Calendar dates are local `YYYY-MM-DD` text and wall-clock times are local `HH:MM` text, so
 *   a "7:00 PM" routine stays at 7:00 PM across timezone and daylight-saving changes.
 * - Booleans are INTEGER 0/1 with CHECK constraints.
 */

export type Migration = {
  version: number;
  description: string;
  statements: string[];
};

const REMINDER_COLUMNS = `
    reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
    reminder_advance_minutes INTEGER NOT NULL DEFAULT 0 CHECK (reminder_advance_minutes >= 0)`;

// Evaluated by SQLite when the migration runs.
const NOW_MS = `CAST(strftime('%s', 'now') AS INTEGER) * 1000`;

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema: tasks, routines, overrides, preferences, clothing, weather',
    statements: [
      // One-off tasks. `date` is required; `time` is optional (untimed tasks stay visible).
      `CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    notes TEXT,
    date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    time TEXT CHECK (time IS NULL OR time GLOB '[0-2][0-9]:[0-5][0-9]'),
    symbol TEXT,
    image_uri TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    status_changed_at INTEGER,${REMINDER_COLUMNS},
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
      `CREATE INDEX idx_tasks_date ON tasks (date)`,

      // Weekly routines. `weekdays` is a bitmask: bit 0 = Sunday ... bit 6 = Saturday (1..127).
      // "Every day" is 127. `start_date` bounds generation; `paused` stops occurrences.
      `CREATE TABLE routines (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    notes TEXT,
    time TEXT NOT NULL CHECK (time GLOB '[0-2][0-9]:[0-5][0-9]'),
    weekdays INTEGER NOT NULL CHECK (weekdays BETWEEN 1 AND 127),
    start_date TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    symbol TEXT,
    image_uri TEXT,
    paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),${REMINDER_COLUMNS},
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

      // Optional steps belong to exactly one task or one routine.
      `CREATE TABLE steps (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT REFERENCES tasks (id) ON DELETE CASCADE,
    routine_id TEXT REFERENCES routines (id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK ((task_id IS NULL) <> (routine_id IS NULL))
  )`,
      `CREATE INDEX idx_steps_task ON steps (task_id, position)`,
      `CREATE INDEX idx_steps_routine ON steps (routine_id, position)`,

      // Per-occurrence exceptions to a routine. Absence of a row means "as scheduled".
      // Override columns are NULL when that field is not changed for this occurrence.
      // `moved_date`/`moved_time` reschedule the occurrence without touching the routine.
      `CREATE TABLE occurrence_overrides (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
    occurrence_date TEXT NOT NULL CHECK (occurrence_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    status_changed_at INTEGER,
    title TEXT CHECK (title IS NULL OR length(trim(title)) > 0),
    notes TEXT,
    moved_date TEXT CHECK (moved_date IS NULL OR moved_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    moved_time TEXT CHECK (moved_time IS NULL OR moved_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    reminder_enabled INTEGER CHECK (reminder_enabled IS NULL OR reminder_enabled IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (routine_id, occurrence_date)
  )`,

      // Key/value settings (visual customization, reminder defaults, quiet hours, weather on/off).
      // Values are JSON text; valid keys and shapes are defined in types.ts.
      `CREATE TABLE preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

      // Clothing options the user may be suggested. `allowed` = may be suggested;
      // `excluded` = never suggest. Rows are seeded by migration 2.
      `CREATE TABLE clothing_options (
    id TEXT PRIMARY KEY NOT NULL,
    label TEXT NOT NULL CHECK (length(trim(label)) > 0),
    category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'full_body', 'outerwear', 'footwear', 'accessory')),
    allowed INTEGER NOT NULL DEFAULT 1 CHECK (allowed IN (0, 1)),
    excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

      // Single row (id = 1). Weather is off by default. Coordinates are only stored for a manual
      // location and are rounded by the app; device location is read on demand, not stored.
      `CREATE TABLE weather_location_settings (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    mode TEXT NOT NULL DEFAULT 'off' CHECK (mode IN ('off', 'device', 'manual')),
    manual_label TEXT,
    manual_latitude REAL CHECK (manual_latitude IS NULL OR manual_latitude BETWEEN -90 AND 90),
    manual_longitude REAL CHECK (manual_longitude IS NULL OR manual_longitude BETWEEN -180 AND 180),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (mode <> 'manual' OR (manual_latitude IS NOT NULL AND manual_longitude IS NOT NULL))
  )`,
    ],
  },
  {
    version: 2,
    description: 'Seed default clothing options and the weather settings row (weather off)',
    statements: [
      `INSERT INTO clothing_options (id, label, category, created_at, updated_at) VALUES
      ('shorts', 'Shorts', 'bottom', ${NOW_MS}, ${NOW_MS}),
      ('trousers', 'Trousers', 'bottom', ${NOW_MS}, ${NOW_MS}),
      ('skirt', 'Skirt', 'bottom', ${NOW_MS}, ${NOW_MS}),
      ('dress', 'Dress', 'full_body', ${NOW_MS}, ${NOW_MS}),
      ('t_shirt', 'T-shirt', 'top', ${NOW_MS}, ${NOW_MS}),
      ('long_sleeve', 'Long-sleeve top', 'top', ${NOW_MS}, ${NOW_MS}),
      ('sweater', 'Sweater', 'top', ${NOW_MS}, ${NOW_MS}),
      ('light_jacket', 'Light jacket', 'outerwear', ${NOW_MS}, ${NOW_MS}),
      ('warm_coat', 'Warm coat', 'outerwear', ${NOW_MS}, ${NOW_MS}),
      ('rain_jacket', 'Rain jacket', 'outerwear', ${NOW_MS}, ${NOW_MS}),
      ('sandals', 'Sandals', 'footwear', ${NOW_MS}, ${NOW_MS}),
      ('sneakers', 'Sneakers', 'footwear', ${NOW_MS}, ${NOW_MS}),
      ('boots', 'Boots', 'footwear', ${NOW_MS}, ${NOW_MS}),
      ('sun_hat', 'Sun hat', 'accessory', ${NOW_MS}, ${NOW_MS}),
      ('warm_hat', 'Warm hat', 'accessory', ${NOW_MS}, ${NOW_MS}),
      ('scarf', 'Scarf', 'accessory', ${NOW_MS}, ${NOW_MS}),
      ('gloves', 'Gloves', 'accessory', ${NOW_MS}, ${NOW_MS}),
      ('umbrella', 'Umbrella', 'accessory', ${NOW_MS}, ${NOW_MS})`,
      `INSERT INTO weather_location_settings (id, mode, created_at, updated_at)
    VALUES (1, 'off', ${NOW_MS}, ${NOW_MS})`,
    ],
  },
  {
    version: 3,
    description: 'Link tasks generated from a routine to that routine and occurrence date',
    statements: [
      `ALTER TABLE tasks ADD COLUMN routine_id TEXT REFERENCES routines (id) ON DELETE CASCADE`,
      `ALTER TABLE tasks ADD COLUMN routine_occurrence_date TEXT`,
      // A routine generates at most one task per occurrence date, even if the task is moved.
      `CREATE UNIQUE INDEX idx_tasks_routine_occurrence
         ON tasks (routine_id, routine_occurrence_date) WHERE routine_id IS NOT NULL`,
    ],
  },
];

export const SCHEMA_VERSION = migrations[migrations.length - 1].version;

export const TABLE_NAMES = [
  'tasks',
  'routines',
  'steps',
  'occurrence_overrides',
  'preferences',
  'clothing_options',
  'weather_location_settings',
] as const;
