import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius } from '@/theme';

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * A short single choice shown side by side. The selected segment is raised onto the surface and
 * bold, so it does not depend on color alone. Use OptionGroup for long or many labels.
 */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  const { palette: theme, spacing, scheme } = useAppearance();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[
        styles.track,
        {
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
  track: { flexDirection: 'row', borderRadius: radius.md, borderCurve: 'continuous' },
  segment: {
    flex: 1,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  center: { textAlign: 'center' },
});
