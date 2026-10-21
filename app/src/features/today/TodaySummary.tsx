import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { clothingCopy, clothingNote } from '@/features/clothing/clothingCopy';
import { useClothingDismissed } from '@/features/clothing/useClothingDismissed';
import {
  forecastForSuggestions,
  outfitFor,
  weatherFacts,
} from '@/features/clothing/suggestionRules';
import { useAppearance } from '@/features/appearance/context';
import { describeWeather, type WeatherAction } from '@/features/weather/weatherDisplay';
import { useTodayWeather } from '@/features/weather/useTodayWeather';
import { borderWidth, minTouchTarget } from '@/theme';

const actionLabels: Record<WeatherAction, string> = {
  retry: 'Try again',
  settings: 'Open Settings',
  device_settings: 'Open device settings',
};

/**
 * One "at a glance" card above the agenda: weather first, then the clothing idea. Weather
 * problems are calm notes and never block the task list. When weather is off, a single quiet row
 * says so and links to its settings.
 */
export function TodaySummary() {
  const { spacing, palette: theme } = useAppearance();
  const router = useRouter();
  const { state, now, retry } = useTodayWeather();
  const view = describeWeather(state, now);
  const forecast = forecastForSuggestions(state);
  const facts = forecast ? weatherFacts(forecast) : null;
  const { dismissed, dismiss, error } = useClothingDismissed();
  const outfit = facts ? outfitFor(facts.highC) : null;

  const onAction = (action: WeatherAction) => {
    if (action === 'retry') retry();
    else if (action === 'settings') router.navigate('/settings/weather');
    else Linking.openSettings().catch((e: unknown) => console.error(e));
  };

  const actionButton = (action: WeatherAction | null) =>
    action ? (
      <Button
        label={actionLabels[action]}
        variant="secondary"
        inline
        onPress={() => onAction(action)}
      />
    ) : null;

  if (view.kind === 'off') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Weather is off."
        accessibilityHint="Opens weather settings"
        onPress={() => router.navigate('/settings/weather')}
        style={({ pressed }) => [
          styles.offRow,
          {
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Ionicons name="partly-sunny-outline" size={20} color={theme.textMuted} />
        <Text variant="caption" muted style={styles.grow}>
          Weather is off. You can turn it on later in Settings.
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </Pressable>
    );
  }

  const divider = (
    <View
      style={[styles.divider, { backgroundColor: theme.separator, marginVertical: spacing.xs }]}
    />
  );

  return (
    <Card style={{ gap: spacing.md }}>
      {view.kind === 'conditions' ? (
        <View style={{ gap: spacing.sm }}>
          <View
            accessible
            accessibilityLabel={view.label}
            style={[styles.row, { gap: spacing.md }]}
          >
            <Text
              variant="heading"
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.icon}
            >
              {view.icon}
            </Text>
            <Text variant="heading" tabular>
              {view.temperature}
            </Text>
            <View style={styles.grow}>
              <Text variant="bodyStrong">{view.condition}</Text>
              {view.details.length > 0 ? (
                <Text variant="caption" muted>
                  {view.details.join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
          {view.notice ? <Text variant="caption">{view.notice}</Text> : null}
          {actionButton(view.action)}
        </View>
      ) : (
        <View
          style={{ gap: spacing.xs }}
          accessible={view.kind === 'loading'}
          accessibilityLabel={view.kind === 'loading' ? 'Weather is loading.' : undefined}
        >
          <Text variant="bodyStrong">{view.kind === 'message' ? view.title : 'Weather'}</Text>
          {view.kind === 'loading' ? <Text muted>Loading weather…</Text> : null}
          {view.kind === 'message' ? <Text muted>{view.body}</Text> : null}
          {view.kind === 'message' ? actionButton(view.action) : null}
        </View>
      )}

      {divider}

      <View style={{ gap: spacing.xs }}>
        <Text
          variant="caption"
          muted
          accessibilityRole="header"
          style={{ fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}
        >
          {clothingCopy.title}
        </Text>
        {error ? (
          <Text variant="caption" style={{ color: theme.danger }}>
            Error: {error}
          </Text>
        ) : null}
        {!outfit ? (
          <Text muted>{clothingCopy.noForecast}</Text>
        ) : dismissed ? (
          <Text muted>{clothingCopy.dismissedAll}</Text>
        ) : (
          <>
            <View
              accessible
              accessibilityLabel={`${clothingCopy.intro} ${outfit.label}. ${clothingCopy.top}: ${outfit.top}. ${clothingCopy.bottom}: ${outfit.bottom}.`}
            >
              <Text variant="bodyStrong">{outfit.label}</Text>
              <Text>
                {clothingCopy.top}: {outfit.top} · {clothingCopy.bottom}: {outfit.bottom}
              </Text>
            </View>
            <Text variant="caption" muted>
              {clothingNote}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${clothingCopy.dismiss} clothing ideas`}
              accessibilityHint="Hides clothing ideas for today"
              onPress={() => void dismiss()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderWidth,
                  borderColor: theme.separator,
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={28} color={theme.primary} />
            </Pressable>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  icon: { width: 40, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
  iconButton: {
    alignSelf: 'flex-end',
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offRow: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center' },
});
