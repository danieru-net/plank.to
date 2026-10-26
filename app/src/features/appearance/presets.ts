import type { AppearanceSettings } from './settings';

export type PresetId = 'calm' | 'focus' | 'playful';

export type AppearancePreset = {
  id: PresetId;
  label: string;
  /** What tapping the preset changes, in plain words. */
  description: string;
  /** Only the settings the preset fills in; every other setting is left as it is. */
  settings: Partial<AppearanceSettings>;
};

/**
 * Presets are shortcuts, not a stored setting. Applying one just updates existing settings, and
 * each of them can be changed afterwards.
 */
export const appearancePresets: readonly AppearancePreset[] = [
  {
    id: 'calm',
    label: 'Calm (low stimulation)',
    description: 'Device colors, animations off, no haptic feedback, and no completion moment.',
    settings: { colorTheme: 'system', motion: 'off', haptics: false, completionMoment: 'none' },
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Larger text and labelled buttons under every task.',
    settings: { textScale: 1.3, taskActions: 'buttons' },
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Bright colors, rounder corners, and larger icons.',
    settings: { colorTheme: 'playful' },
  },
];

/** The settings after applying a preset: its values replace the matching ones, the rest stay. */
export function applyPreset(
  current: AppearanceSettings,
  preset: AppearancePreset,
): AppearanceSettings {
  return { ...current, ...preset.settings };
}
