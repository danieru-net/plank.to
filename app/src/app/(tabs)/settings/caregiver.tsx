import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { useCaregiverLock } from '@/features/caregiver/CaregiverLockProvider';

export default function CaregiverLockScreen() {
  const { spacing } = useAppearance();
  const router = useRouter();
  const { enabled, setEnabled, relock, error } = useCaregiverLock();
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <Card style={{ gap: spacing.sm }}>
        <ToggleRow
          label="Caregiver lock"
          description="Asks a grown-up question before Settings, adding or editing tasks and routines, and sending feedback."
          checked={enabled}
          onChange={setEnabled}
        />
      </Card>
      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Card style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">How it works</Text>
        <Text muted>
          To open a locked screen, hold a button for 3 seconds and answer a multiplication question.
          There is no PIN to remember and no account. With a screen reader, double tap the button
          instead of holding it.
        </Text>
        <Text muted>
          Completing a task, undoing it, and dismissing it for today stay open, so a child can use
          Today. After you unlock, things stay open for 5 minutes, or until the app goes to the
          background.
        </Text>
        <Text muted>
          The lock is a gentle speed bump so the plan is not changed by accident. It is not
          security.
        </Text>
      </Card>
      {enabled ? (
        <Button
          label="Lock now"
          icon="lock-closed-outline"
          variant="secondary"
          onPress={() => {
            relock();
            router.dismissTo('/settings');
          }}
        />
      ) : null}
    </Screen>
  );
}
