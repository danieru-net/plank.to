import { View } from 'react-native';

import { Button } from '@/components/Button';
import { InlineNotice } from '@/components/InlineNotice';
import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { permissionStatusText, reminderExplanation } from './permission';
import { useReminderPermission } from './useReminderPermission';

type Props = {
  /** "today" is a one-time invitation that can be dismissed; "settings" always shows the status. */
  placement: 'today' | 'settings';
};

/** Explains reminders before the OS prompt, and shows status. Continuing without them is always fine. */
export function ReminderPermissionCard({ placement }: Props) {
  const { spacing } = useAppearance();
  const { permission, dismissed, error, request, dismiss, openSystemSettings } =
    useReminderPermission();

  if (placement === 'today' && (permission !== 'undetermined' || dismissed)) return null;
  if (permission === null && !error) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <InlineNotice
        title="Reminders"
        message={
          permission === 'undetermined'
            ? reminderExplanation
            : permission
              ? permissionStatusText[permission]
              : 'Plank could not check whether reminders are allowed.'
        }
      >
        {permission === 'undetermined' ? (
          <Text variant="caption" muted>
            {permissionStatusText.undetermined}
          </Text>
        ) : null}
        {permission === 'undetermined' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Button label="Turn on reminders" inline onPress={() => void request()} />
            {placement === 'today' ? (
              <Button label="Not now" variant="plain" inline onPress={() => void dismiss()} />
            ) : null}
          </View>
        ) : null}
        {permission === 'undetermined' && placement === 'settings' ? (
          <Text variant="caption" muted>
            You can skip this and keep using Plank without reminders.
          </Text>
        ) : null}
        {permission === 'denied' ? (
          <Button
            label="Open device settings"
            variant="secondary"
            inline
            onPress={() => void openSystemSettings()}
          />
        ) : null}
      </InlineNotice>
      {error ? <InlineNotice tone="error" message={error} /> : null}
    </View>
  );
}
