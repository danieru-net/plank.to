import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius } from '@/theme';

/** Text scale (in-app size times system size) from which segments stack instead of sitting side by side. */
const STACK_AT_TEXT_SCALE = 1.3;

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A short single choice shown side by side. The selected segment is raised onto the surface and
 * bold, so it does not depend on color alone. Use OptionGroup for long or many labels. At large
 * text sizes the segments stack, so a label never breaks in the middle of a word.
 */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  const { palette: theme, spacing, scheme, settings } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale * settings.textScale >= STACK_AT_TEXT_SCALE;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        styles.track,
        {
          flexDirection: stacked ? 'column' : 'row',
          backgroundColor: scheme === 'dark' ? theme.background : theme.separator,
          padding: spacing.xs,
          gap: spacing.xs,
        },
      ]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              {
                flex: stacked ? undefined : 1,
                paddingHorizontal: spacing.sm,
                backgroundColor: selected ? theme.surface : 'transparent',
                boxShadow: selected ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined,
              },
            ]}
          >
            <Text
              variant={selected ? 'bodyStrong' : 'body'}
              muted={!selected}
              style={styles.center}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.md, borderCurve: 'continuous' },
  segment: {
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  center: { textAlign: 'center' },
});
