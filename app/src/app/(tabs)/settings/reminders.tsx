import { Screen } from '@/components/Screen';
import { useAppearance } from '@/features/appearance/context';
import { ReminderPermissionCard } from '@/features/notifications/ReminderPermissionCard';
import { ReminderSettingsCard } from '@/features/notifications/ReminderSettingsCard';

export default function RemindersSettingsScreen() {
  const { spacing } = useAppearance();
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <ReminderPermissionCard placement="settings" />
      <ReminderSettingsCard />
    </Screen>
  );
}
