import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import { AppearanceProvider } from '@/features/appearance/AppearanceProvider';
import { useAppearance } from '@/features/appearance/context';
import { CaregiverLockProvider } from '@/features/caregiver/CaregiverLockProvider';
import { ReminderResponder } from '@/features/notifications/ReminderResponder';
import { ReminderReconciler } from '@/features/notifications/useReminderReconciler';
import { useStackScreenOptions } from '@/theme/navigation';

function Navigator() {
  const { scheme } = useAppearance();
  const options = useStackScreenOptions();
  return (
    <>
      <Stack
        screenOptions={{
          ...options,
          // Without this the back button is named after the route group, "(tabs)".
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="editor" options={{ title: 'New task', presentation: 'modal' }} />
        <Stack.Screen name="routine" options={{ title: 'New routine', presentation: 'modal' }} />
        <Stack.Screen
          name="occurrence"
          options={{ title: 'Change this day', presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppearanceProvider>
        <CaregiverLockProvider>
          <Navigator />
          <ReminderReconciler />
          <ReminderResponder />
        </CaregiverLockProvider>
      </AppearanceProvider>
    </DatabaseProvider>
  );
}
