/** 4pt grid. Rows use sm, groups md, sections xl: related things sit closer together. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/** Corner radii and icon size that a color theme may override; see `shapeFor`. */
export type Shape = {
  radius: { card: number; button: number };
  iconSize: number;
};

/** Shape used by every theme except those that override it. */
export const defaultShape: Shape = {
  radius: { card: radius.lg, button: radius.md },
  iconSize: 20,
};

/** Rounder cards, pill-like buttons, and larger icons for the Playful theme. */
export const playfulShape: Shape = {
  radius: { card: 28, button: 24 },
  iconSize: 24,
};

/** Four sizes, two weights (600 for emphasis, 700 only for the largest size). */
export const typography = {
  body: { fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  heading: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  caption: { fontSize: 14, lineHeight: 20 },
} as const;

export type TextVariant = keyof typeof typography;

/** Which typeface the app uses; "readable" is Atkinson Hyperlegible, bundled with the app. */
export type FontChoice = 'system' | 'readable';

/** Extra line height (as a multiple of font size) added by the "More line spacing" setting. */
export const moreLineSpacingExtra = 0.2;

/** Atkinson Hyperlegible has Regular and Bold only, so 600 and 700 both map to Bold. */
export const readableFontFamily = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
} as const;

export type TextStyleTokens = {
  fontSize: number;
  lineHeight: number;
  fontFamily?: string;
  fontWeight?: '600' | '700';
  letterSpacing?: number;
};

export type ScaledTypography = { [K in TextVariant]: TextStyleTokens };

/**
 * Text styles for a text scale, typeface and line spacing.
 * Custom fonts on Android ignore fontWeight, so the readable font picks a weight-specific family
 * and leaves fontWeight out. Line height scales with font size, and "more spacing" adds
 * `moreLineSpacingExtra` times the font size on top of each variant's own ratio.
 */
export function buildTypography(
  textScale: number,
  font: FontChoice,
  moreLineSpacing: boolean,
): ScaledTypography {
  const out = {} as ScaledTypography;
  for (const variant of Object.keys(typography) as TextVariant[]) {
    const base = typography[variant] as {
      fontSize: number;
      lineHeight: number;
      fontWeight?: '600' | '700';
      letterSpacing?: number;
    };
    const fontSize = base.fontSize * textScale;
    const ratio = base.lineHeight / base.fontSize + (moreLineSpacing ? moreLineSpacingExtra : 0);
    const style: TextStyleTokens = { fontSize, lineHeight: Math.round(fontSize * ratio) };
    if (base.letterSpacing !== undefined) style.letterSpacing = base.letterSpacing;
    if (font === 'readable') {
      style.fontFamily = base.fontWeight ? readableFontFamily.bold : readableFontFamily.regular;
    } else if (base.fontWeight) {
      style.fontWeight = base.fontWeight;
    }
    out[variant] = style;
  }
  return out;
}

/** Minimum touch target (points); meets iOS 44pt and Android 48dp guidance. */
export const minTouchTarget = 48;

/** Cap for system text scaling so layouts stay usable at the largest sizes. */
export const maxFontSizeMultiplier = 2;

export const borderWidth = 1.5;

/** Soft elevation for cards; use via `boxShadow`, never legacy shadow props. */
export const cardShadow = '0 1px 2px rgba(48, 40, 24, 0.05), 0 4px 14px rgba(48, 40, 24, 0.06)';
