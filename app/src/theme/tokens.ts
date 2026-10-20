export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 22,
} as const;

export const typography = {
  body: { fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  heading: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  caption: { fontSize: 14, lineHeight: 20 },
} as const;

export type TextVariant = keyof typeof typography;

/** Minimum touch target (points); meets iOS 44pt and Android 48dp guidance. */
export const minTouchTarget = 48;

/** Cap for system text scaling so layouts stay usable at the largest sizes. */
export const maxFontSizeMultiplier = 2;

export const borderWidth = 1.5;

/** Soft elevation for cards; use via `boxShadow`, never legacy shadow props. */
export const cardShadow = '0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 16px rgba(0, 0, 0, 0.06)';
