import { allPalettes } from '@/theme/colors';
import { spacing } from '@/theme/tokens';
import { defaultAppearance, parseAppearance, spacingFor } from './settings';

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
    ).toEqual({ textScale: 1.3, density: 'compact', colorTheme: 'sage' });
  });

  it('falls back per field for invalid values', () => {
    expect(
      parseAppearance({
        'display.textScale': 9,
        'display.density': 'tiny',
        'display.colorTheme': 'sage',
      }),
    ).toEqual({ textScale: 1, density: 'comfortable', colorTheme: 'sage' });
    expect(parseAppearance({ 'display.colorTheme': 42 }).colorTheme).toBe('system');
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

describe('allPalettes', () => {
  it('covers every theme in light and dark where applicable', () => {
    const names = allPalettes().map(([n]) => n);
    expect(names).toContain('sage/dark');
    expect(names).toContain('light/light');
    expect(names).not.toContain('light/dark');
  });
});
