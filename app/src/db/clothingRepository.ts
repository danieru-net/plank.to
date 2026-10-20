import { toStorageError } from './errors';
import type { TaskDb } from './taskRepository';
import type { ClothingOptionRow } from './types';

export type ClothingRepository = ReturnType<typeof createClothingRepository>;

/**
 * Access to the seeded `clothing_options` rows. `allowed` = may be suggested; `excluded` = never
 * suggest (wins over `allowed`). Rows are never added or removed, only flagged.
 */
export function createClothingRepository(db: TaskDb, options: { now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  const failed = (message: string, e: unknown) => toStorageError('query_failed', message, e);

  async function setFlag(id: string, column: 'allowed' | 'excluded', value: boolean) {
    try {
      await db.runAsync(`UPDATE clothing_options SET ${column} = ?, updated_at = ? WHERE id = ?`, [
        value ? 1 : 0,
        now(),
        id,
      ]);
    } catch (e) {
      throw failed('Could not save your clothing choice.', e);
    }
  }

  return {
    async list(): Promise<ClothingOptionRow[]> {
      try {
        return await db.getAllAsync<ClothingOptionRow>(
          'SELECT * FROM clothing_options ORDER BY rowid',
          [],
        );
      } catch (e) {
        throw failed('Could not load your clothing choices.', e);
      }
    },
    setAllowed: (id: string, allowed: boolean) => setFlag(id, 'allowed', allowed),
    setExcluded: (id: string, excluded: boolean) => setFlag(id, 'excluded', excluded),
    /** Back to the defaults: every option may be suggested and none is excluded. */
    async reset(): Promise<void> {
      try {
        await db.runAsync('UPDATE clothing_options SET allowed = 1, excluded = 0, updated_at = ?', [
          now(),
        ]);
      } catch (e) {
        throw failed('Could not reset your clothing choices.', e);
      }
    },
  };
}
