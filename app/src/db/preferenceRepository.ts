import { toStorageError } from './errors';
import type { TaskDb } from './taskRepository';
import type { PreferenceKey, PreferenceRow, PreferenceValues } from './types';

export type PreferenceRepository = ReturnType<typeof createPreferenceRepository>;

/**
 * Typed access to the JSON key/value `preferences` table. Unreadable stored values are skipped
 * (callers fall back to defaults) rather than failing the whole app.
 */
export function createPreferenceRepository(db: TaskDb, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;

  return {
    /** Returns every stored preference as a raw (unvalidated) JSON value, keyed by name. */
    async getAll(): Promise<Record<string, unknown>> {
      try {
        const rows = await db.getAllAsync<PreferenceRow>(
          'SELECT key, value FROM preferences ORDER BY key',
          [],
        );
        const out: Record<string, unknown> = {};
        for (const row of rows) {
          try {
            out[row.key] = JSON.parse(row.value);
          } catch {
            // Skip a corrupt value; the default applies.
          }
        }
        return out;
      } catch (e) {
        throw toStorageError('query_failed', 'Could not load your settings.', e);
      }
    },

    async set<K extends PreferenceKey>(key: K, value: PreferenceValues[K]): Promise<void> {
      const t = now();
      try {
        await db.runAsync(
          `INSERT INTO preferences (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, JSON.stringify(value), t, t],
        );
      } catch (e) {
        throw toStorageError('query_failed', 'Could not save your settings.', e);
      }
    },

    async remove(key: PreferenceKey): Promise<void> {
      try {
        await db.runAsync('DELETE FROM preferences WHERE key = ?', [key]);
      } catch (e) {
        throw toStorageError('query_failed', 'Could not reset your settings.', e);
      }
    },
  };
}
