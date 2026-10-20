import { useAppearance } from '@/features/appearance/context';
import type { Palette } from './colors';

export * from './colors';
export * from './tokens';

export function useTheme(): Palette {
  return useAppearance().palette;
}
