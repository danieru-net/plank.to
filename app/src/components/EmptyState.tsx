import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';

type Props = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  const { spacing, palette: theme } = useAppearance();
  return (
    <View
      style={[styles.container, { padding: spacing.lg, gap: spacing.md }]}
      accessible={!actionLabel}
      accessibilityLabel={`${title}. ${message ?? ''}`}
    >
      <Ionicons name="sunny-outline" size={44} color={theme.primary} />
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text muted style={{ textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
});
