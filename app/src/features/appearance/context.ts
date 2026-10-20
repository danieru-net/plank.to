import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { resolvePalette, type Palette } from '@/theme/colors';
import { maxFontSizeMultiplier } from '@/theme/tokens';
import { defaultAppearance, spacingFor, type AppearanceSettings, type Spacing } from './settings';

export type Appearance = {
  settings: AppearanceSettings;
  palette: Palette;
  spacing: Spacing;
  /** Cap for system text scaling so in-app size times system size stays within the overall cap. */
  maxFontMultiplier: number;
};

export function buildAppearance(
  settings: AppearanceSettings,
  systemScheme: 'light' | 'dark',
): Appearance {
  return {
    settings,
    palette: resolvePalette(settings.colorTheme, systemScheme),
    spacing: spacingFor(settings.density),
    maxFontMultiplier: Math.max(1, maxFontSizeMultiplier / settings.textScale),
  };
}

export const AppearanceContext = createContext<Appearance | null>(null);

/** Current appearance; falls back to defaults (following the device) outside the provider. */
export function useAppearance(): Appearance {
  const ctx = useContext(AppearanceContext);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const fallback = useMemo(() => buildAppearance(defaultAppearance, scheme), [scheme]);
  return ctx ?? fallback;
}
