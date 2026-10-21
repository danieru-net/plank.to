import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ListRow, ListSection } from '@/components/List';
import { Screen } from '@/components/Screen';
import { useAppearance } from '@/features/appearance/context';
import { radius } from '@/theme';

type Page = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

const pages: Page[] = [
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

const feedbackPages: Page[] = [
  {
    title: 'Suggest a feature or improvement',
    subtitle: 'Share an idea for the app',
    icon: 'bulb-outline',
    href: { pathname: '/settings/feedback', params: { kind: 'idea' } },
  },
  {
    title: 'Report a problem',
    subtitle: 'Tell us what went wrong',
    icon: 'chatbubble-ellipses-outline',
    href: { pathname: '/settings/feedback', params: { kind: 'problem' } },
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const row = (p: Page) => (
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
  );
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <ListSection footer="Everything here is saved on this device and applies across the app.">
        {pages.map(row)}
      </ListSection>
      <ListSection
        title="Feedback"
        footer="Opens an email you can read and change before sending. Nothing is sent until you press Send."
      >
        {feedbackPages.map(row)}
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
