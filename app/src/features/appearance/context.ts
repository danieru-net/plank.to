import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { resolvePalette, schemeFor, type ColorScheme, type Palette } from '@/theme/colors';
import { maxFontSizeMultiplier } from '@/theme/tokens';
import { defaultAppearance, spacingFor, type AppearanceSettings, type Spacing } from './settings';

export type Appearance = {
  settings: AppearanceSettings;
  palette: Palette;
  /** Whether the chosen colors are light or dark. */
  scheme: ColorScheme;
  spacing: Spacing;
  /** Cap for system text scaling so in-app size times system size stays within the overall cap. */
  maxFontMultiplier: number;
  /** False when the user turned animations off, or chose "Match device" and the device reduces motion. */
  motion: boolean;
};

export function buildAppearance(
  settings: AppearanceSettings,
  systemScheme: 'light' | 'dark',
  systemReducesMotion = false,
): Appearance {
  return {
    settings,
    palette: resolvePalette(settings.colorTheme, systemScheme),
    scheme: schemeFor(settings.colorTheme, systemScheme),
    spacing: spacingFor(settings.density),
    maxFontMultiplier: Math.max(1, maxFontSizeMultiplier / settings.textScale),
    motion: settings.motion === 'on' || (settings.motion === 'system' && !systemReducesMotion),
  };
}

export const AppearanceContext = createContext<Appearance | null>(null);

/** Current appearance; falls back to defaults (following the device) outside the provider. */
export function useAppearance(): Appearance {
  const ctx = useContext(AppearanceContext);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const reduced = useReducedMotion();
  const fallback = useMemo(
    () => buildAppearance(defaultAppearance, scheme, reduced),
    [scheme, reduced],
  );
  return ctx ?? fallback;
}
