import { colorThemes, defaultColorTheme, type ColorTheme } from '@/theme/colors';
import { spacing } from '@/theme/tokens';

export type Density = 'comfortable' | 'compact';
/** "system" follows the device's Reduce Motion setting. */
export type Motion = 'system' | 'on' | 'off';
/** "compact" shows a check circle and a menu on each task; "buttons" shows labelled buttons. */
export type TaskActions = 'compact' | 'buttons';

export type AppearanceSettings = {
  textScale: number;
  density: Density;
  colorTheme: ColorTheme;
  motion: Motion;
  haptics: boolean;
  taskActions: TaskActions;
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

export const motionOptions: { value: Motion; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export const taskActionOptions: { value: TaskActions; label: string }[] = [
  { value: 'compact', label: 'Check circle and menu' },
  { value: 'buttons', label: 'Labelled buttons' },
];

export const defaultAppearance: AppearanceSettings = {
  textScale: 1,
  density: 'comfortable',
  colorTheme: defaultColorTheme,
  motion: 'system',
  haptics: true,
  taskActions: 'compact',
};

/** Reads stored preference values, ignoring anything missing or invalid (defaults apply). */
export function parseAppearance(stored: Record<string, unknown>): AppearanceSettings {
  const scale = stored['display.textScale'];
  const density = stored['display.density'];
  const theme = stored['display.colorTheme'];
  const motion = stored['display.motion'];
  const haptics = stored['display.haptics'];
  const taskActions = stored['display.taskActions'];
  return {
    textScale: textScaleOptions.some((o) => o.value === scale)
      ? (scale as number)
      : defaultAppearance.textScale,
    density: density === 'comfortable' || density === 'compact' ? density : 'comfortable',
    colorTheme: colorThemes.includes(theme as ColorTheme)
      ? (theme as ColorTheme)
      : defaultAppearance.colorTheme,
    motion: motionOptions.some((o) => o.value === motion)
      ? (motion as Motion)
      : defaultAppearance.motion,
    haptics: typeof haptics === 'boolean' ? haptics : defaultAppearance.haptics,
    taskActions:
      taskActions === 'compact' || taskActions === 'buttons'
        ? taskActions
        : defaultAppearance.taskActions,
  };
}

export const compactSpacingFactor = 0.75;

export type Spacing = { [K in keyof typeof spacing]: number };

/** Spacing tokens for a density; compact tightens gaps and padding but never touch targets. */
export function spacingFor(density: Density): Spacing {
  if (density === 'comfortable') return spacing;
  return Object.fromEntries(
    Object.entries(spacing).map(([k, v]) => [k, Math.round(v * compactSpacingFactor)]),
  ) as Spacing;
}
