
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useAppearanceControls } from '@/features/appearance/AppearanceProvider';
import { useAppearance } from '@/features/appearance/context';
import { ReminderPermissionCard } from '@/features/notifications/ReminderPermissionCard';
import { ReminderSettingsCard } from '@/features/notifications/ReminderSettingsCard';
import { WeatherSettingsCard } from '@/features/weather/WeatherSettingsCard';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import { densityOptions, textScaleOptions } from '@/features/appearance/settings';
import { colorThemeLabels, colorThemes } from '@/theme';

const colorOptions = colorThemes.map((value) => ({ value, label: colorThemeLabels[value] }));

export default function SettingsScreen() {
  const { settings, palette } = useAppearance();
  const { update, reset, error } = useAppearanceControls();
  return (
    <Screen>
      <Text variant="heading">Appearance</Text>
      <Text muted>These settings are saved on this device and apply everywhere in the app.</Text>
      <OptionGroup
        label="Text size"
        options={textScaleOptions}
        value={settings.textScale}
        onChange={(textScale) => update({ textScale })}
      />
      <OptionGroup
        label="Spacing"
        options={densityOptions}
        value={settings.density}
        onChange={(density) => update({ density })}
      />
      <OptionGroup
        label="Colors"
        options={colorOptions}
        value={settings.colorTheme}
        onChange={(colorTheme) => update({ colorTheme })}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          Error: {error}
        </Text>
      ) : null}
      <Button label="Reset appearance" variant="secondary" onPress={reset} />
      <ReminderPermissionCard placement="settings" />
      <ReminderSettingsCard />
      <WeatherSettingsCard />
    </Screen>
  );
}
