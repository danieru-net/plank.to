import { buildTypography, moreLineSpacingExtra, readableFontFamily, typography } from './tokens';

describe('buildTypography', () => {
  it('matches the base tokens at standard scale with the system font', () => {
    const t = buildTypography(1, 'system', false);
    expect(t.body).toEqual({ fontSize: 17, lineHeight: 24 });
    expect(t.title).toMatchObject({ fontSize: 22, lineHeight: 28, fontWeight: '600' });
    expect(t.heading).toMatchObject({ fontWeight: '700', letterSpacing: -0.4 });
    expect(t.body.fontFamily).toBeUndefined();
  });

  it('scales font size and line height together', () => {
    const t = buildTypography(1.5, 'system', false);
    expect(t.body.fontSize).toBe(25.5);
    expect(t.body.lineHeight).toBe(36);
  });

  it('increases line height with more spacing, for every variant and scale', () => {
    for (const scale of [1, 1.15, 1.3, 1.5]) {
      const normal = buildTypography(scale, 'system', false);
      const more = buildTypography(scale, 'system', true);
      for (const v of Object.keys(typography) as (keyof typeof typography)[]) {
        expect(more[v].lineHeight).toBeGreaterThan(normal[v].lineHeight);
        expect(more[v].fontSize).toBe(normal[v].fontSize);
        // Never less than the font size, so text cannot clip.
        expect(more[v].lineHeight).toBeGreaterThanOrEqual(more[v].fontSize * 1.4);
      }
    }
    expect(buildTypography(1, 'system', true).body.lineHeight).toBe(
      Math.round(17 * (24 / 17 + moreLineSpacingExtra)),
    );
  });

  it('uses weight-specific readable families and drops fontWeight', () => {
    const t = buildTypography(1, 'readable', false);
    expect(t.body.fontFamily).toBe(readableFontFamily.regular);
    expect(t.caption.fontFamily).toBe(readableFontFamily.regular);
    for (const v of ['bodyStrong', 'title', 'heading'] as const) {
      expect(t[v].fontFamily).toBe(readableFontFamily.bold);
      expect(t[v].fontWeight).toBeUndefined();
    }
    expect(t.title.letterSpacing).toBe(-0.2);
  });
});
