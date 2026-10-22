import { allPalettes, colorThemes, palettes, resolvePalette } from './colors';

describe('resolvePalette', () => {
  it('uses the base palette for system, light and dark', () => {
    expect(resolvePalette('system', 'dark')).toEqual(palettes.dark);
    expect(resolvePalette('light', 'dark')).toEqual(palettes.light);
    expect(resolvePalette('dark', 'light')).toEqual(palettes.dark);
  });

  it('merges accent themes over the base palette', () => {
    expect(resolvePalette('sage', 'light')).toEqual({
      ...palettes.light,
      primary: '#2E6B47',
      onPrimary: '#FFFFFF',
      focus: '#2E6B47',
    });
    expect(resolvePalette('clay', 'dark')).toEqual({
      ...palettes.dark,
      primary: '#F0B48F',
      onPrimary: '#2E1606',
      focus: '#F0B48F',
    });
  });

  it('tints the background and surface for blossom in both schemes', () => {
    const light = resolvePalette('blossom', 'light');
    expect(light.background).toBe('#FFF4F7');
    expect(light.surface).toBe('#FFFFFF');
    const dark = resolvePalette('blossom', 'dark');
    expect(dark.background).toBe('#1C1218');
    expect(dark.surface).toBe('#2A1B24');
  });

  it('uses a warm background, violet primary, and a decorative accent for playful', () => {
    const light = resolvePalette('playful', 'light');
    expect(light.background).toBe('#FFF7E8');
    expect(light.surface).toBe('#FFFFFF');
    expect(light.primary).toBe('#5B2FD0');
    expect(light.accent).toBe('#FF7A1A');
    const dark = resolvePalette('playful', 'dark');
    expect(dark.background).toBe('#16122B');
    expect(dark.primary).toBe('#B9A8FF');
    expect(dark.accent).toBe('#FFB54D');
  });
});

describe('allPalettes', () => {
  it('covers every theme with the schemes it can render', () => {
    const names = allPalettes().map(([name]) => name);
    for (const theme of colorThemes) {
      const expected =
        theme === 'light'
          ? ['light/light']
          : theme === 'dark'
            ? ['dark/dark']
            : [`${theme}/light`, `${theme}/dark`];
      expect(names.filter((n) => n.startsWith(`${theme}/`))).toEqual(expected);
    }
  });
});
