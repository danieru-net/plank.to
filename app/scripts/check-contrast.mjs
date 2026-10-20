// Verifies palette contrast ratios (WCAG 2.x). Run with: npm run check:contrast
import { allPalettes, contrastRequirements } from '../src/theme/colors.ts';
import { contrastRatio as ratio } from '../src/theme/contrast.ts';

let failed = false;
for (const [scheme, palette] of allPalettes()) {
  for (const { fg, bg, min } of contrastRequirements) {
    const r = ratio(palette[fg], palette[bg]);
    const ok = r >= min;
    if (!ok) failed = true;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`);
  }
}
process.exit(failed ? 1 : 0);
