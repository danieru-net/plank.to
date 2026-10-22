import { Stack } from 'expo-router';

import { useCaregiverLock } from '@/features/caregiver/CaregiverLockProvider';
import { useStackScreenOptions } from '@/theme/navigation';

export default function SettingsLayout() {
  const options = useStackScreenOptions({ largeTitle: true });
  const { status } = useCaregiverLock();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      {/* While the caregiver lock is closed, only the Settings page (which shows the gate) exists,
          so a link or the back stack cannot reach the pages behind it. */}
      <Stack.Protected guard={status === 'open'}>
        <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="weather" options={{ title: 'Weather' }} />
        <Stack.Screen name="caregiver" options={{ title: 'Caregiver lock' }} />
        <Stack.Screen name="feedback" options={{ title: 'Feedback' }} />
      </Stack.Protected>
    </Stack>
  );
}
