import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: theme.text,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 0,
          boxShadow: '0 -1px 12px rgba(0, 0, 0, 0.06)',
        },
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarAccessibilityLabel: 'Today',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'today' : 'today-outline'}
              color={focused ? theme.primary : theme.textMuted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarAccessibilityLabel: 'Routines',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'repeat' : 'repeat-outline'}
              color={focused ? theme.primary : theme.textMuted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings and profile',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              color={focused ? theme.primary : theme.textMuted}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
