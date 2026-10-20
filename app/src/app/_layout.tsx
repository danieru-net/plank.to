import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/db/DatabaseProvider';
import { AppearanceProvider } from '@/features/appearance/AppearanceProvider';
import { useAppearance } from '@/features/appearance/context';
import { ReminderResponder } from '@/features/notifications/ReminderResponder';
import { ReminderReconciler } from '@/features/notifications/useReminderReconciler';
import { palettes } from '@/theme';

function Navigator() {
  const { palette: theme } = useAppearance();
  return (
    <>
      <Stack
        screenOptions={{
          // Without this the back button is named after the route group, "(tabs)".
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
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
      <StatusBar style={theme.background === palettes.dark.background ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppearanceProvider>
        <Navigator />
        <ReminderReconciler />
        <ReminderResponder />
      </AppearanceProvider>
    </DatabaseProvider>
  );
}
