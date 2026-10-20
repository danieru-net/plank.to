import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/theme/navigation';

export default function SettingsLayout() {
  const options = useStackScreenOptions({ largeTitle: true });
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Stack.Screen name="weather" options={{ title: 'Weather' }} />
    </Stack>
  );
}
