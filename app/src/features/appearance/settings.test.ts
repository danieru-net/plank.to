import { allPalettes, colorThemes } from '@/theme/colors';
import { spacing } from '@/theme/tokens';
import { defaultAppearance, parseAppearance, shapeFor, spacingFor } from './settings';

describe('parseAppearance', () => {
  it('uses defaults when nothing is stored', () => {
    expect(parseAppearance({})).toEqual(defaultAppearance);
  });

  it('accepts valid stored values', () => {
    expect(
      parseAppearance({
        'display.textScale': 1.3,
        'display.density': 'compact',
        'display.colorTheme': 'sage',
      }),
    ).toEqual({ ...defaultAppearance, textScale: 1.3, density: 'compact', colorTheme: 'sage' });
    expect(
      parseAppearance({
        'display.motion': 'off',
        'display.haptics': false,
        'display.taskActions': 'buttons',
      }),
    ).toEqual({ ...defaultAppearance, motion: 'off', haptics: false, taskActions: 'buttons' });
    expect(parseAppearance({ 'display.picturesFirst': true }).picturesFirst).toBe(true);
  });

  it('falls back per field for invalid values', () => {
    expect(
      parseAppearance({
        'display.textScale': 9,
        'display.density': 'tiny',
        'display.colorTheme': 'sage',
      }),
    ).toEqual({ ...defaultAppearance, colorTheme: 'sage' });
    expect(parseAppearance({ 'display.colorTheme': 42 }).colorTheme).toBe('system');
    expect(
      parseAppearance({
        'display.motion': 'fast',
        'display.haptics': 'yes',
        'display.taskActions': 'swipe',
        'display.picturesFirst': 'yes',
      }),
    ).toEqual(defaultAppearance);
  });
});

describe('spacingFor', () => {
  it('keeps comfortable spacing and tightens compact spacing', () => {
    expect(spacingFor('comfortable')).toEqual(spacing);
    const compact = spacingFor('compact');
    expect(compact.md).toBeLessThan(spacing.md);
    expect(compact.xs).toBeGreaterThan(0);
  });
});

describe('shapeFor', () => {
  it('keeps the original shape for every theme except Playful', () => {
    for (const theme of colorThemes.filter((t) => t !== 'playful')) {
      expect(shapeFor(theme)).toEqual({ radius: { card: 20, button: 12 }, iconSize: 20 });
    }
  });

  it('gives Playful rounder corners and larger icons', () => {
    expect(shapeFor('playful')).toEqual({ radius: { card: 28, button: 24 }, iconSize: 24 });
  });
});

describe('allPalettes', () => {
  it('covers every theme in light and dark where applicable', () => {
    const names = allPalettes().map(([n]) => n);
    expect(names).toContain('sage/dark');
    expect(names).toContain('light/light');
    expect(names).not.toContain('light/dark');
  });
});
