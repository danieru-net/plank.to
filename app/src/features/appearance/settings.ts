import { colorThemes, defaultColorTheme, type ColorTheme } from '@/theme/colors';
import { spacing } from '@/theme/tokens';

export type Density = 'comfortable' | 'compact';

export type AppearanceSettings = {
  textScale: number;
  density: Density;
  colorTheme: ColorTheme;
};

export const textScaleOptions = [
  { value: 1, label: 'Standard' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Larger' },
  { value: 1.5, label: 'Largest' },
] as const;

export const densityOptions: { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

export const defaultAppearance: AppearanceSettings = {
  textScale: 1,
  density: 'comfortable',
  colorTheme: defaultColorTheme,
};

/** Reads stored preference values, ignoring anything missing or invalid (defaults apply). */
export function parseAppearance(stored: Record<string, unknown>): AppearanceSettings {
  const scale = stored['display.textScale'];
  const density = stored['display.density'];
  const theme = stored['display.colorTheme'];
  return {
    textScale: textScaleOptions.some((o) => o.value === scale)
      ? (scale as number)
      : defaultAppearance.textScale,
    density: density === 'comfortable' || density === 'compact' ? density : 'comfortable',
    colorTheme: colorThemes.includes(theme as ColorTheme)
      ? (theme as ColorTheme)
      : defaultAppearance.colorTheme,
  };
}

export const compactSpacingFactor = 0.75;

export type Spacing = { [K in keyof typeof spacing]: number };

/** Spacing tokens for a density; compact tightens gaps and padding but never touch targets. */
export function spacingFor(density: Density): Spacing {
  if (density === 'comfortable') return spacing;
  return {
    xs: Math.round(spacing.xs * compactSpacingFactor),
    sm: Math.round(spacing.sm * compactSpacingFactor),
    md: Math.round(spacing.md * compactSpacingFactor),
    lg: Math.round(spacing.lg * compactSpacingFactor),
    xl: Math.round(spacing.xl * compactSpacingFactor),
  };
}
