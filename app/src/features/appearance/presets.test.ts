import { colorThemes } from '@/theme/colors';
import { appearancePresets, applyPreset } from './presets';
import {
  completionMomentOptions,
  defaultAppearance,
  motionOptions,
  parseAppearance,
  taskActionOptions,
  textScaleOptions,
  type AppearanceSettings,
} from './settings';

describe('appearancePresets', () => {
  it('has unique ids and non-empty text', () => {
    expect(new Set(appearancePresets.map((p) => p.id)).size).toBe(appearancePresets.length);
    for (const p of appearancePresets) {
      expect(p.label).not.toBe('');
      expect(p.description).not.toBe('');
      expect(Object.keys(p.settings).length).toBeGreaterThan(0);
    }
  });

  it('only uses existing settings with valid values', () => {
    for (const { settings } of appearancePresets) {
      for (const key of Object.keys(settings)) expect(key in defaultAppearance).toBe(true);
      if (settings.colorTheme) expect(colorThemes).toContain(settings.colorTheme);
      if (settings.textScale)
        expect(textScaleOptions.map((o) => o.value)).toContain(settings.textScale);
      if (settings.motion) expect(motionOptions.map((o) => o.value)).toContain(settings.motion);
      if (settings.taskActions)
        expect(taskActionOptions.map((o) => o.value)).toContain(settings.taskActions);
      if (settings.completionMoment)
        expect(completionMomentOptions.map((o) => o.value)).toContain(settings.completionMoment);
      if (settings.haptics !== undefined) expect(typeof settings.haptics).toBe('boolean');
    }
  });

  it('survives the same parsing as stored settings', () => {
    for (const preset of appearancePresets) {
      const applied = applyPreset(defaultAppearance, preset);
      const stored = Object.fromEntries(
        Object.entries(applied).map(([k, v]) => [`display.${k}`, v]),
      );
      expect(parseAppearance(stored)).toEqual(applied);
    }
  });

  it('leaves unrelated settings untouched', () => {
    const current: AppearanceSettings = {
      ...defaultAppearance,
      density: 'compact',
      picturesFirst: true,
      readAloud: true,
      simpleMode: true,
    };
    for (const preset of appearancePresets) {
      const applied = applyPreset(current, preset);
      for (const key of Object.keys(current) as (keyof AppearanceSettings)[]) {
        if (!(key in preset.settings)) expect(applied[key]).toBe(current[key]);
      }
      expect(applied).toMatchObject(preset.settings);
    }
  });
});
