import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { borderWidth, radius } from '@/theme';
import { permissionStatusText, reminderExplanation } from './permission';
import { useReminderPermission } from './useReminderPermission';

type Props = {
  /** "today" is a one-time invitation that can be dismissed; "settings" always shows the status. */
  placement: 'today' | 'settings';
};

/** Explains reminders before the OS prompt, and shows status. Continuing without them is always fine. */
export function ReminderPermissionCard({ placement }: Props) {
  const { palette: theme, spacing } = useAppearance();
  const { permission, dismissed, error, request, dismiss, openSystemSettings } =
    useReminderPermission();

  if (placement === 'today' && (permission !== 'undetermined' || dismissed)) return null;
  if (permission === null && !error) return null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      <Text variant="bodyStrong">Reminders</Text>
      {permission === 'undetermined' ? <Text>{reminderExplanation}</Text> : null}
      {permission ? <Text muted>{permissionStatusText[permission]}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}
      {permission === 'undetermined' ? (
        <>
          <Button label="Turn on reminders" onPress={() => void request()} />
          {placement === 'today' ? (
            <Button label="Not now" variant="secondary" onPress={() => void dismiss()} />
          ) : (
            <Text muted>You can skip this and keep using Plank without reminders.</Text>
          )}
        </>
      ) : null}
      {permission === 'denied' ? (
        <Button
          label="Open device settings"
          variant="secondary"
          onPress={() => void openSystemSettings()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth, borderRadius: radius.md },
});
