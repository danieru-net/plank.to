import { colorThemes, defaultColorTheme, type ColorTheme } from '@/theme/colors';
import { defaultShape, playfulShape, spacing, type FontChoice, type Shape } from '@/theme/tokens';

export type Density = 'comfortable' | 'compact';
/** "system" follows the device's Reduce Motion setting. */
export type Motion = 'system' | 'on' | 'off';
/** "compact" shows a check circle and a menu on each task; "buttons" shows labelled buttons. */
export type TaskActions = 'compact' | 'buttons';

/** What happens when a task is completed: nothing, a brief check, or a brief check and a soft sound. */
export type CompletionMoment = 'none' | 'check' | 'checkSound';

export type AppearanceSettings = {
  textScale: number;
  density: Density;
  colorTheme: ColorTheme;
  motion: Motion;
  haptics: boolean;
  taskActions: TaskActions;
  /** Shows a task's picture or symbol large, above its title. */
  picturesFirst: boolean;
  /** Shows a Read aloud button on each task, which speaks its title and notes. */
  readAloud: boolean;
  /** An optional gentle moment when a task is completed. Never a streak, score or praise. */
  completionMoment: CompletionMoment;
  /** Hides weather, clothing and the Routines tab, leaving Today and Settings. Only hides UI. */
  simpleMode: boolean;
  /** The typeface: the device's own, or Atkinson Hyperlegible, designed for easy reading. */
  font: FontChoice;
  /** Adds extra space between lines of text. */
  moreLineSpacing: boolean;
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

export const completionMomentOptions: { value: CompletionMoment; label: string }[] = [
  { value: 'none', label: 'Nothing' },
  { value: 'check', label: 'Check' },
  { value: 'checkSound', label: 'Check and sound' },
];

export const fontOptions: { value: FontChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'readable', label: 'Atkinson Hyperlegible (readable)' },
];

export const defaultAppearance: AppearanceSettings = {
  textScale: 1,
  density: 'comfortable',
  colorTheme: defaultColorTheme,
  motion: 'system',
  haptics: true,
  taskActions: 'compact',
  picturesFirst: false,
  readAloud: false,
  completionMoment: 'none',
  simpleMode: false,
  font: 'system',
  moreLineSpacing: false,
};

/** Reads stored preference values, ignoring anything missing or invalid (defaults apply). */
export function parseAppearance(stored: Record<string, unknown>): AppearanceSettings {
  const scale = stored['display.textScale'];
  const density = stored['display.density'];
  const theme = stored['display.colorTheme'];
  const motion = stored['display.motion'];
  const haptics = stored['display.haptics'];
  const taskActions = stored['display.taskActions'];
  const picturesFirst = stored['display.picturesFirst'];
  const readAloud = stored['display.readAloud'];
  const completionMoment = stored['display.completionMoment'];
  const simpleMode = stored['display.simpleMode'];
  const font = stored['display.font'];
  const moreLineSpacing = stored['display.moreLineSpacing'];
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
    picturesFirst:
      typeof picturesFirst === 'boolean' ? picturesFirst : defaultAppearance.picturesFirst,
    readAloud: typeof readAloud === 'boolean' ? readAloud : defaultAppearance.readAloud,
    completionMoment: completionMomentOptions.some((o) => o.value === completionMoment)
      ? (completionMoment as CompletionMoment)
      : defaultAppearance.completionMoment,
    simpleMode: typeof simpleMode === 'boolean' ? simpleMode : defaultAppearance.simpleMode,
    font: font === 'system' || font === 'readable' ? font : defaultAppearance.font,
    moreLineSpacing:
      typeof moreLineSpacing === 'boolean' ? moreLineSpacing : defaultAppearance.moreLineSpacing,
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

/** Shape tokens for a color theme; only Playful differs from the default. */
export function shapeFor(theme: ColorTheme): Shape {
  return theme === 'playful' ? playfulShape : defaultShape;
}
