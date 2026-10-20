import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Static accessibility guards (plan 6.4). These scan source text, so they catch regressions in
 * the common mistakes but do not replace a VoiceOver/TalkBack pass.
 */
const SRC = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.tsx') && !full.endsWith('.test.tsx') ? [full] : [];
  });
}

const files = sourceFiles(SRC).map((file) => ({
  name: path.relative(SRC, file),
  text: readFileSync(file, 'utf8'),
}));

/** Returns the full opening tag text (up to the matching `>`) for each occurrence of `<Tag`. */
function openingTags(text: string, tag: string): string[] {
  const tags: string[] = [];
  const re = new RegExp(`<${tag}(?=[\\s>/])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + 1;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0 && text[i - 1] !== '=') break;
    }
    tags.push(text.slice(m.index, i + 1));
  }
  return tags;
}

describe('accessibility (static)', () => {
  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('every Pressable has a role, an accessible name, and state where it is a toggle', () => {
    const bad: string[] = [];
    for (const { name, text } of files) {
      for (const tag of openingTags(text, 'Pressable')) {
        if (!/accessibilityRole=/.test(tag) || !/accessibilityLabel=/.test(tag)) {
          bad.push(`${name}: ${tag.split('\n')[0]}`);
        }
        if (
          /accessibilityRole="(checkbox|radio|switch)"/.test(tag) &&
          !/accessibilityState=/.test(tag)
        ) {
          bad.push(`${name}: toggle without accessibilityState`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('does not use TouchableOpacity or other touchables without roles (use Button or Pressable)', () => {
    const bad = files
      .filter(({ text }) =>
        /Touchable(Opacity|Highlight|WithoutFeedback)|TouchableNativeFeedback/.test(text),
      )
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });

  it('never turns off font scaling', () => {
    const bad = files
      .filter(({ text }) => /allowFontScaling=\{?false/.test(text))
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });

  it('uses the themed Text component instead of react-native Text', () => {
    const bad = files
      .filter(
        ({ name, text }) =>
          name !== path.join('components', 'Text.tsx') &&
          /import\s*\{[^}]*\bText\b[^}]*\}\s*from 'react-native'/.test(text),
      )
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });

  it('gives every TextInput a label and font scaling', () => {
    const bad: string[] = [];
    for (const { name, text } of files) {
      for (const tag of openingTags(text, 'TextInput')) {
        if (!/accessibilityLabel=/.test(tag) || !/allowFontScaling/.test(tag)) bad.push(name);
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps touch targets at 48 or more in the shared controls', () => {
    const { minTouchTarget } = jest.requireActual('@/theme/tokens') as { minTouchTarget: number };
    expect(minTouchTarget).toBeGreaterThanOrEqual(48);
    const shared = [
      'components/Button.tsx',
      'components/TextField.tsx',
      'features/appearance/OptionGroup.tsx',
      'features/notifications/CheckboxRow.tsx',
    ];
    for (const f of shared) {
      const text = files.find((x) => x.name === f)?.text ?? '';
      expect(text).toMatch(/minHeight: minTouchTarget/);
    }
  });

  it('every Pressable-based control sets a minimum size from the touch target token', () => {
    const bad = files
      .filter(({ text }) => /<Pressable/.test(text) && !/minTouchTarget/.test(text))
      .map((f) => f.name);
    expect(bad).toEqual([]);
  });

  it('shows selected and checked state with a mark, not color alone', () => {
    for (const f of [
      'features/appearance/OptionGroup.tsx',
      'features/notifications/CheckboxRow.tsx',
    ]) {
      expect(files.find((x) => x.name === f)?.text).toContain('checkmark');
    }
  });
});
