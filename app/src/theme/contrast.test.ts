import { allPalettes, contrastRequirements } from './colors';
import { contrastRatio } from './contrast';

describe('contrastRatio', () => {
  it('is 21:1 for black on white and symmetric', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for identical colors', () => {
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe('palettes', () => {
  it('checks Blossom and Playful in light and dark', () => {
    const names = allPalettes().map(([scheme]) => scheme);
    for (const theme of ['blossom', 'playful']) {
      expect(names).toContain(`${theme}/light`);
      expect(names).toContain(`${theme}/dark`);
    }
  });

  for (const [scheme, palette] of allPalettes()) {
    for (const { fg, bg, min } of contrastRequirements) {
      it(`${scheme}: ${fg} on ${bg} meets ${min}:1`, () => {
        expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
      });
    }
  }
});
