import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget } from '@/theme';

type Props = {
  label: string;
  /** Optional explanation under the label. */
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * A labelled on/off setting drawn as a native switch. The whole row is the control, so the target
 * is large; the state shows as the switch position, not color alone.
 */
export function ToggleRow({ label, description, checked, onChange }: Props) {
  const { palette: theme, spacing } = useAppearance();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[styles.row, { paddingVertical: spacing.sm, gap: spacing.md }]}
    >
      <View style={styles.label}>
        <Text>{label}</Text>
        {description ? (
          <Text variant="caption" muted>
            {description}
          </Text>
        ) : null}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Switch
          value={checked}
          trackColor={{ true: theme.primary, false: theme.separator }}
          ios_backgroundColor={theme.separator}
          accessibilityElementsHidden
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1, gap: 2 },
});
