import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useAppearance } from '@/features/appearance/context';
import { CheckboxRow } from '@/features/notifications/CheckboxRow';
import { borderWidth, radius } from '@/theme';
import { useWeatherSettings } from './useWeatherSettings';
import {
  deviceLocationExplanation,
  locationPermissionText,
  normalizeSearchText,
  weatherDisclosure,
} from './weatherSettings';

/** Weather is off by default; this card explains what is sent before anything is requested. */
export function WeatherSettingsCard() {
  const { palette: theme, spacing } = useAppearance();
  const w = useWeatherSettings();
  const [text, setText] = useState('');
  const { enabled, location } = w.settings;

  const locationSummary =
    location.mode === 'manual'
      ? `Using ${location.label}.`
      : location.mode === 'device'
        ? 'Using your approximate device location.'
        : 'No location chosen yet.';

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
          padding: spacing.md,
          gap: spacing.md,
        },
      ]}
    >
      <Text variant="bodyStrong">Weather</Text>
      <Text>{weatherDisclosure}</Text>
      <CheckboxRow
        label="Show weather"
        checked={enabled}
        onChange={(next) => void w.setEnabled(next)}
      />

      {enabled ? (
        <>
          <Text accessibilityRole="header" variant="bodyStrong">
            Location
          </Text>
          <Text>{locationSummary}</Text>

          <View style={{ gap: spacing.sm }}>
            <Text muted>{deviceLocationExplanation}</Text>
            {w.permission ? <Text muted>{locationPermissionText[w.permission]}</Text> : null}
            {location.mode !== 'device' && w.permission !== 'denied' ? (
              <Button
                label="Use my device location"
                variant="secondary"
                onPress={() => void w.useDeviceLocation()}
              />
            ) : null}
            {w.permission === 'denied' ? (
              <Button
                label="Open device settings"
                variant="secondary"
                onPress={() => void w.openSystemSettings()}
              />
            ) : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <TextField
              label="Search for a city or postcode"
              testID="weather-search"
              hint="Only the text you type is sent to Open-Meteo, when you press Search."
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => void w.search(text)}
              returnKeyType="search"
              autoCorrect={false}
            />
            <Button
              label={w.searching ? 'Searching…' : 'Search'}
              variant="secondary"
              disabled={w.searching || !normalizeSearchText(text)}
              onPress={() => void w.search(text)}
            />
            {w.results && w.results.length === 0 ? (
              <Text muted>No places found. Try a different spelling.</Text>
            ) : null}
            {w.results?.map((place) => (
              <Button
                key={place.key}
                label={place.label}
                variant="secondary"
                onPress={() => {
                  setText('');
                  void w.choosePlace(place);
                }}
              />
            ))}
          </View>

          {location.mode !== 'off' ? (
            <Button
              label="Remove location"
              variant="secondary"
              onPress={() => void w.removeLocation()}
            />
          ) : null}
        </>
      ) : null}

      {w.error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {w.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth, borderRadius: radius.md },
});
