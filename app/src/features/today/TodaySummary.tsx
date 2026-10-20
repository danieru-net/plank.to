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
import { WEATHER_ATTRIBUTION } from '@/features/weather/forecast';
import { describeWeather, type WeatherAction } from '@/features/weather/weatherDisplay';
import { useTodayWeather } from '@/features/weather/useTodayWeather';
import { minTouchTarget } from '@/theme';

const actionLabels: Record<WeatherAction, string> = {
  retry: 'Try again',
  settings: 'Open Settings',
  device_settings: 'Open device settings',
};

/**
 * Weather card, then the clothing ideas card, shown above the agenda.
 * Weather problems are shown as calm notes and never block the task list.
 */
export function TodaySummary() {
  const { spacing } = useAppearance();
  const router = useRouter();
  const { state, now, retry } = useTodayWeather();
  const view = describeWeather(state, now);
  const forecast = forecastForSuggestions(state);
  const facts = forecast ? weatherFacts(forecast) : null;
  const { dismissed, dismiss, error } = useClothingDismissed();
  const outfit = facts ? outfitFor(facts.highC) : null;

  const onAction = (action: WeatherAction) => {
    if (action === 'retry') retry();
    else if (action === 'settings') router.navigate('/settings');
    else Linking.openSettings().catch((e: unknown) => console.error(e));
  };

  const actionButton = (action: WeatherAction | null) =>
    action ? (
      <Button label={actionLabels[action]} variant="secondary" onPress={() => onAction(action)} />
    ) : null;

  return (
    <View style={{ gap: spacing.sm }}>
      {view.kind === 'conditions' ? (
        <Card>
          <View accessible accessibilityLabel={view.label} style={{ gap: spacing.xs }}>
            <Text variant="bodyStrong">Weather</Text>
            <View style={[styles.row, { gap: spacing.md }]}>
              <Text variant="heading" accessibilityElementsHidden importantForAccessibility="no">
                {view.icon}
              </Text>
              <Text variant="bodyStrong" style={styles.grow}>
                {view.summary}
              </Text>
            </View>
            {view.details.map((d) => (
              <Text key={d} muted>
                {d}
              </Text>
            ))}
            {view.notice ? <Text>{view.notice}</Text> : null}
          </View>
          {actionButton(view.action)}
          <Attribution />
        </Card>
      ) : (
        <Card
          accessible={view.kind !== 'message'}
          accessibilityLabel={
            view.kind === 'off'
              ? 'Weather is off.'
              : view.kind === 'loading'
                ? 'Weather is loading.'
                : undefined
          }
        >
          <Text variant="bodyStrong">{view.kind === 'message' ? view.title : 'Weather'}</Text>
          {view.kind === 'off' ? (
            <Text muted>Weather is off. You can turn it on later in Settings.</Text>
          ) : null}
          {view.kind === 'loading' ? <Text muted>Loading weather…</Text> : null}
          {view.kind === 'message' ? (
            <>
              <Text muted>{view.body}</Text>
              {actionButton(view.action)}
            </>
          ) : null}
        </Card>
      )}
      <Card>
        <Text variant="bodyStrong">{clothingCopy.title}</Text>
        {error ? <Text>Error: {error}</Text> : null}
        {!outfit ? (
          <Text muted>{clothingCopy.noForecast}</Text>
        ) : dismissed ? (
          <Text muted>{clothingCopy.dismissedAll}</Text>
        ) : (
          <>
            <Text muted>{clothingCopy.intro}</Text>
            <View
              accessible
              accessibilityLabel={`${clothingCopy.top}: ${outfit.top}. ${clothingCopy.bottom}: ${outfit.bottom}.`}
            >
              <Text variant="bodyStrong">{outfit.label}</Text>
              <Text>
                {clothingCopy.top}: {outfit.top}
              </Text>
              <Text>
                {clothingCopy.bottom}: {outfit.bottom}
              </Text>
            </View>
            <Text variant="caption" muted>
              {clothingNote}
            </Text>
            <Button
              label={clothingCopy.dismiss}
              accessibilityLabel={`${clothingCopy.dismiss} clothing ideas`}
              variant="secondary"
              accessibilityHint="Hides clothing ideas for today"
              onPress={() => void dismiss()}
            />
          </>
        )}
      </Card>
    </View>
  );
}

function Attribution() {
  const { palette: theme } = useAppearance();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${WEATHER_ATTRIBUTION.text}. Opens in your browser.`}
      onPress={() =>
        Linking.openURL(WEATHER_ATTRIBUTION.url).catch((e: unknown) => console.error(e))
      }
      style={styles.link}
    >
      <Text variant="caption" style={{ color: theme.primary, textDecorationLine: 'underline' }}>
        {WEATHER_ATTRIBUTION.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  link: { minHeight: minTouchTarget, justifyContent: 'center' },
});
