import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { tint } from '@/theme';

type Props = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = 'sunny-outline',
}: Props) {
  const { spacing, palette: theme } = useAppearance();
  return (
    <View
      style={[styles.container, { paddingVertical: spacing.xl, gap: spacing.md }]}
      accessible={!actionLabel}
      accessibilityLabel={`${title}. ${message ?? ''}`}
    >
      <View style={[styles.badge, { backgroundColor: tint(theme.primary, 0.1) }]}>
        <Ionicons name={icon} size={32} color={theme.primary} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header" style={styles.center}>
          {title}
        </Text>
        {message ? (
          <Text muted style={styles.center}>
            {message}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <View>
          <Button label={actionLabel} icon="add" inline onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: { textAlign: 'center' },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
