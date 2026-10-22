export type ColorScheme = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  /** Outline for inputs and toggles that must be found by their edge (3:1). */
  border: string;
  /** Decorative hairline between grouped rows; never the only cue for a control. */
  separator: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  danger: string;
  onDanger: string;
  focus: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    background: '#F3F2EE',
    surface: '#FFFFFF',
    border: '#767676',
    separator: '#E2E0DA',
    text: '#1B1B1B',
    textMuted: '#525252',
    primary: '#2B5C8A',
    onPrimary: '#FFFFFF',
    danger: '#A12D2D',
    onDanger: '#FFFFFF',
    focus: '#1F4E7A',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    border: '#8C8C8C',
    separator: '#333333',
    text: '#EDEDED',
    textMuted: '#B0B0B0',
    primary: '#8DB8E3',
    onPrimary: '#10202F',
    danger: '#F0A3A3',
    onDanger: '#2A0B0B',
    focus: '#A9CDF0',
  },
};

export const colorThemes = ['system', 'light', 'dark', 'sage', 'plum', 'clay'] as const;
export type ColorTheme = (typeof colorThemes)[number];
export const defaultColorTheme: ColorTheme = 'system';

export const colorThemeLabels: Record<ColorTheme, string> = {
  system: 'Match device',
  light: 'Light',
  dark: 'Dark',
  sage: 'Sage (green accent)',
  plum: 'Plum (purple accent)',
  clay: 'Clay (orange accent)',
};

type Override = Partial<Palette>;
type OverrideTheme = Exclude<ColorTheme, 'system' | 'light' | 'dark'>;

/**
 * Per-scheme palette overrides, merged over the base palette. Accent themes only set
 * primary/onPrimary/focus; a theme may override any `Palette` key. All follow the device's
 * light/dark setting.
 */
const overrides: Record<OverrideTheme, Record<ColorScheme, Override>> = {
  sage: {
    light: { primary: '#2E6B47', onPrimary: '#FFFFFF', focus: '#2E6B47' },
    dark: { primary: '#8CCBA5', onPrimary: '#0F2417', focus: '#8CCBA5' },
  },
  plum: {
    light: { primary: '#7A3D7A', onPrimary: '#FFFFFF', focus: '#7A3D7A' },
    dark: { primary: '#D9A6D9', onPrimary: '#2A112A', focus: '#D9A6D9' },
  },
  clay: {
    light: { primary: '#9A4A1F', onPrimary: '#FFFFFF', focus: '#9A4A1F' },
    dark: { primary: '#F0B48F', onPrimary: '#2E1606', focus: '#F0B48F' },
  },
};

/** Whether a color theme renders light or dark, given the device's setting. */
export function schemeFor(theme: ColorTheme, systemScheme: ColorScheme): ColorScheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return systemScheme;
}

/** A translucent version of a #rrggbb color, for soft fills such as secondary buttons. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** The palette for a chosen color theme; `systemScheme` is the device's light/dark setting. */
export function resolvePalette(theme: ColorTheme, systemScheme: ColorScheme): Palette {
  if (theme === 'light' || theme === 'dark') return palettes[theme];
  if (theme === 'system') return palettes[systemScheme];
  return { ...palettes[systemScheme], ...overrides[theme][systemScheme] };
}

/** Every palette a user can end up with, for contrast verification. */
export function allPalettes(): [string, Palette][] {
  const out: [string, Palette][] = [];
  for (const theme of colorThemes) {
    for (const scheme of ['light', 'dark'] as const) {
      // Fixed light/dark themes only ever render their own scheme.
      if ((theme === 'light' || theme === 'dark') && theme !== scheme) continue;
      out.push([`${theme}/${scheme}`, resolvePalette(theme, scheme)]);
    }
  }
  return out;
}

/** Foreground/background pairs that must meet the given WCAG contrast ratio. */
export const contrastRequirements: {
  fg: keyof Palette;
  bg: keyof Palette;
  min: number;
}[] = [
  { fg: 'text', bg: 'background', min: 4.5 },
  { fg: 'text', bg: 'surface', min: 4.5 },
  { fg: 'textMuted', bg: 'background', min: 4.5 },
  { fg: 'textMuted', bg: 'surface', min: 4.5 },
  { fg: 'onPrimary', bg: 'primary', min: 4.5 },
  { fg: 'onDanger', bg: 'danger', min: 4.5 },
  { fg: 'primary', bg: 'background', min: 4.5 },
  { fg: 'primary', bg: 'surface', min: 4.5 },
  { fg: 'danger', bg: 'background', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  // Non-text UI boundaries and focus indicators need 3:1.
  { fg: 'border', bg: 'background', min: 3 },
  { fg: 'border', bg: 'surface', min: 3 },
  { fg: 'focus', bg: 'background', min: 3 },
];
