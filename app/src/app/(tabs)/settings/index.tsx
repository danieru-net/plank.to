import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListRow, ListSection } from '@/components/List';
import { Screen } from '@/components/Screen';
import { useAppearance } from '@/features/appearance/context';
import { radius } from '@/theme';

const pages: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}[] = [
  {
    title: 'Appearance',
    subtitle: 'Text size, spacing, colors, motion',
    icon: 'text-outline',
    href: '/settings/appearance',
  },
  {
    title: 'Reminders',
    subtitle: 'Permission, notice, snooze, quiet hours',
    icon: 'notifications-outline',
    href: '/settings/reminders',
  },
  {
    title: 'Weather',
    subtitle: 'Forecast, location, clothing ideas',
    icon: 'partly-sunny-outline',
    href: '/settings/weather',
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { palette: theme } = useAppearance();
  return (
    <Screen>
      <ListSection footer="Everything here is saved on this device and applies across the app.">
        {pages.map((p) => (
          <ListRow
            key={p.title}
            title={p.title}
            subtitle={p.subtitle}
            chevron
            onPress={() => router.push(p.href)}
            leading={
              <View style={[styles.icon, { backgroundColor: theme.primary }]}>
                <Ionicons name={p.icon} size={18} color={theme.onPrimary} />
              </View>
            }
          />
        ))}
      </ListSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
