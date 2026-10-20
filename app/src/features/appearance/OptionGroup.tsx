import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { borderWidth, minTouchTarget, radius } from '@/theme';
import { useAppearance } from './context';

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A labelled single-choice group. The selected option shows a check mark, not just color. */
export function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  const { palette: theme, spacing } = useAppearance();
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="bodyStrong">{label}</Text>
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
              styles.option,
              {
                borderColor: selected ? theme.primary : theme.border,
                backgroundColor: theme.surface,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                gap: spacing.sm,
              },
            ]}
          >
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={theme.primary}
            />
            <Text variant={selected ? 'bodyStrong' : 'body'} style={styles.optionText}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: minTouchTarget,
    borderWidth,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: { flex: 1 },
});
