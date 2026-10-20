import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { toStorageError } from './errors';
import { migrate } from './migrate';

export const DATABASE_NAME = 'plank.db';

/** Opens the app database, enables foreign keys, and applies pending migrations. */
export async function initializeDatabase(name: string = DATABASE_NAME): Promise<SQLiteDatabase> {
  let db: SQLiteDatabase;
  try {
    db = await openDatabaseAsync(name);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  } catch (e) {
    throw toStorageError('open_failed', 'Could not open your saved data on this device.', e);
  }
  try {
    await migrate(db);
  } catch (e) {
    await db.closeAsync().catch(() => undefined);
    throw e;
  }
  return db;
}
