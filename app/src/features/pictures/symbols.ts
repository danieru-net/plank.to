/**
 * Symbols a task or routine can show next to its title. The database stores the `id`, not the
 * emoji, so every symbol keeps a spoken label and the list can change without breaking data.
 * Unknown ids (for example from a newer version of the app) are shown as no symbol.
 */
export type TaskSymbol = { id: string; emoji: string; label: string };

export const TASK_SYMBOLS: readonly TaskSymbol[] = [
  { id: 'wake', emoji: '⏰', label: 'Alarm clock' },
  { id: 'shower', emoji: '🚿', label: 'Shower' },
  { id: 'bath', emoji: '🛁', label: 'Bath' },
  { id: 'teeth', emoji: '🪥', label: 'Toothbrush' },
  { id: 'toilet', emoji: '🚽', label: 'Toilet' },
  { id: 'clothes', emoji: '👕', label: 'Clothes' },
  { id: 'shoes', emoji: '👟', label: 'Shoes' },
  { id: 'meal', emoji: '🍽️', label: 'Meal' },
  { id: 'drink', emoji: '🥤', label: 'Drink' },
  { id: 'medicine', emoji: '💊', label: 'Medicine' },
  { id: 'school', emoji: '🏫', label: 'School' },
  { id: 'work', emoji: '💼', label: 'Work' },
  { id: 'homework', emoji: '📚', label: 'Books' },
  { id: 'writing', emoji: '✏️', label: 'Pencil' },
  { id: 'computer', emoji: '💻', label: 'Computer' },
  { id: 'phone', emoji: '📞', label: 'Phone call' },
  { id: 'shopping', emoji: '🛒', label: 'Shopping' },
  { id: 'cleaning', emoji: '🧹', label: 'Cleaning' },
  { id: 'laundry', emoji: '🧺', label: 'Laundry' },
  { id: 'cooking', emoji: '🍳', label: 'Cooking' },
  { id: 'walk', emoji: '🚶', label: 'Walk' },
  { id: 'bus', emoji: '🚌', label: 'Bus' },
  { id: 'car', emoji: '🚗', label: 'Car' },
  { id: 'exercise', emoji: '🏃', label: 'Exercise' },
  { id: 'swim', emoji: '🏊', label: 'Swimming' },
  { id: 'play', emoji: '🧸', label: 'Play' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'art', emoji: '🎨', label: 'Art' },
  { id: 'pet', emoji: '🐾', label: 'Pet' },
  { id: 'plant', emoji: '🪴', label: 'Plant' },
  { id: 'doctor', emoji: '🩺', label: 'Doctor' },
  { id: 'friends', emoji: '👋', label: 'Seeing people' },
  { id: 'rest', emoji: '🛋️', label: 'Rest' },
  { id: 'quiet', emoji: '🎧', label: 'Quiet time' },
  { id: 'bed', emoji: '🛏️', label: 'Bed' },
  { id: 'star', emoji: '⭐', label: 'Star' },
];

const byId = new Map(TASK_SYMBOLS.map((s) => [s.id, s]));

export function isSymbolId(id: string): boolean {
  return byId.has(id);
}

export function findSymbol(id: string | null | undefined): TaskSymbol | null {
  return (id && byId.get(id)) || null;
}
