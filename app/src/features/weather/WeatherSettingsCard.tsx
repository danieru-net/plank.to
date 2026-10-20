import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { ListRow, ListSection } from '@/components/List';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { useWeatherSettings } from './useWeatherSettings';
import {
  deviceLocationExplanation,
  locationPermissionText,
  normalizeSearchText,
  weatherDisclosure,
} from './weatherSettings';

/** Weather is off by default; this explains what is sent before anything is requested. */
export function WeatherSettingsCard() {
  const { palette: theme, spacing } = useAppearance();
  const w = useWeatherSettings();
  const [text, setText] = useState('');
  const { enabled, location } = w.settings;
  const footer = { paddingHorizontal: spacing.md };

  const locationSummary =
    location.mode === 'manual'
      ? `Using ${location.label}.`
      : location.mode === 'device'
        ? 'Using your approximate device location.'
        : 'No location chosen yet.';

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Card style={{ paddingVertical: spacing.xs }}>
          <ToggleRow
            label="Show weather"
            checked={enabled}
            onChange={(next) => void w.setEnabled(next)}
          />
        </Card>
        <Text variant="caption" muted style={footer}>
          {weatherDisclosure}
        </Text>
      </View>

      {enabled ? (
        <>
          <View style={{ gap: spacing.sm }}>
            <SectionLabel>Location</SectionLabel>
            <Card>
              <View style={[styles.row, { gap: spacing.sm }]}>
                <Ionicons
                  name={location.mode === 'off' ? 'location-outline' : 'location'}
                  size={20}
                  color={theme.primary}
                />
                <Text variant="bodyStrong" style={styles.grow}>
                  {locationSummary}
                </Text>
              </View>
              <Text variant="caption" muted>
                {deviceLocationExplanation}
              </Text>
              {w.permission ? (
                <Text variant="caption" muted>
                  {locationPermissionText[w.permission]}
                </Text>
              ) : null}
              {location.mode !== 'device' && w.permission !== 'denied' ? (
                <Button
                  label="Use my device location"
                  icon="navigate-outline"
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
              {location.mode !== 'off' ? (
                <Button
                  label="Remove location"
                  variant="plainDanger"
                  inline
                  onPress={() => void w.removeLocation()}
                />
              ) : null}
            </Card>
          </View>

          <View style={{ gap: spacing.sm }}>
            <SectionLabel>Or search for a place</SectionLabel>
            <Card style={{ gap: spacing.md }}>
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
                icon="search"
                variant="secondary"
                disabled={w.searching || !normalizeSearchText(text)}
                onPress={() => void w.search(text)}
              />
            </Card>
            {w.results && w.results.length === 0 ? (
              <Text muted style={footer}>
                No places found. Try a different spelling.
              </Text>
            ) : null}
            {w.results && w.results.length > 0 ? (
              <ListSection title="Results">
                {w.results.map((place) => (
                  <ListRow
                    key={place.key}
                    title={place.label}
                    chevron
                    onPress={() => {
                      setText('');
                      void w.choosePlace(place);
                    }}
                  />
                ))}
              </ListSection>
            ) : null}
          </View>
        </>
      ) : null}

      {w.error ? <InlineNotice tone="error" message={w.error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
