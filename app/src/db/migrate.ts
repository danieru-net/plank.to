import { StorageError, toStorageError } from './errors';
import { migrations as allMigrations, type Migration } from './schema';

/** The subset of expo-sqlite's SQLiteDatabase that the migration runner needs. */
export type MigrationDb = {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string): Promise<T | null>;
};

export async function getSchemaVersion(db: MigrationDb): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Applies pending migrations in order. Each migration and its `user_version` bump run in one
 * transaction, so a failure leaves the database at the last fully applied version.
 * Returns the resulting schema version.
 */
export async function migrate(
  db: MigrationDb,
  migrations: Migration[] = allMigrations,
): Promise<number> {
  const latest = migrations.length ? migrations[migrations.length - 1].version : 0;
  let current: number;
  try {
    current = await getSchemaVersion(db);
  } catch (e) {
    throw toStorageError('migration_failed', 'Could not read the saved data version.', e);
  }
  if (current > latest) {
    throw new StorageError(
      'unsupported_version',
      'Your saved data was created by a newer version of the app. Please update the app.',
    );
  }

  for (const m of migrations) {
    if (m.version <= current) continue;
    try {
      await db.execAsync('BEGIN');
      try {
        for (const sql of m.statements) await db.execAsync(sql);
        await db.execAsync(`PRAGMA user_version = ${m.version}`);
        await db.execAsync('COMMIT');
      } catch (e) {
        await db.execAsync('ROLLBACK').catch(() => undefined);
        throw e;
      }
    } catch (e) {
      throw toStorageError(
        'migration_failed',
        `Could not update your saved data (step ${m.version}). Your existing data was not changed.`,
        e,
      );
    }
    current = m.version;
  }
  return current;
}
