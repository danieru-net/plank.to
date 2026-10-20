import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/theme/navigation';

export default function RoutinesLayout() {
  const options = useStackScreenOptions({ largeTitle: true });
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Routines' }} />
    </Stack>
  );
}
