import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { borderWidth, minTouchTarget, radius } from '@/theme';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** A labelled on/off choice. The state shows as a check mark and bold text, not color alone. */
export function CheckboxRow({ label, checked, onChange }: Props) {
  const { palette: theme, spacing } = useAppearance();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[
        styles.row,
        {
          borderColor: checked ? theme.primary : theme.border,
          backgroundColor: theme.surface,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={theme.primary}
      />
      <Text variant={checked ? 'bodyStrong' : 'body'} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    borderWidth,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: { flex: 1 },
});
