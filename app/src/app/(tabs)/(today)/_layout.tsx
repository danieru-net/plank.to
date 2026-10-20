import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/theme/navigation';

export default function TodayLayout() {
  const options = useStackScreenOptions({ largeTitle: true });
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Today' }} />
    </Stack>
  );
}
