import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { TimeField } from '@/components/TimeField';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import { advanceOptions, snoozeOptions } from './reminderSettings';
import { useReminderSettings } from './useReminderSettings';

/** Device-wide reminder choices: default notice, snooze, quiet hours, sound, and vibration. */
export function ReminderSettingsCard() {
  const { palette: theme, spacing } = useAppearance();
  const { settings, update, reset, error } = useReminderSettings();
  const { quietHours } = settings;
  const footer = { paddingHorizontal: spacing.md };
  const divider = <View style={[styles.divider, { backgroundColor: theme.separator }]} />;

  return (
    <View style={{ gap: spacing.lg }}>
      <Text muted style={footer}>
        Reminders are optional for each task and routine. These choices apply to all of them and are
        saved on this device.
      </Text>
      <OptionGroup
        label="Suggested notice for new reminders"
        options={advanceOptions}
        value={settings.defaultAdvanceMinutes}
        onChange={(defaultAdvanceMinutes) => update({ defaultAdvanceMinutes })}
      />
      <OptionGroup
        label="Snooze for"
        options={snoozeOptions}
        value={settings.snoozeMinutes}
        onChange={(snoozeMinutes) => update({ snoozeMinutes })}
        footer="The Snooze button on a reminder asks once more after this long. It does not repeat on its own."
      />

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Quiet hours</SectionLabel>
        <Card style={{ paddingVertical: spacing.xs, gap: spacing.md }}>
          <ToggleRow
            label="Hold reminders during quiet hours"
            checked={quietHours.enabled}
            onChange={(enabled) => update({ quietHours: { ...quietHours, enabled } })}
          />
          {quietHours.enabled ? (
            <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
              <TimeField
                label="Quiet hours start"
                value={quietHours.start}
                onChange={(start) => start && update({ quietHours: { ...quietHours, start } })}
              />
              <TimeField
                label="Quiet hours end"
                value={quietHours.end}
                onChange={(end) => end && update({ quietHours: { ...quietHours, end } })}
              />
            </View>
          ) : null}
        </Card>
        <Text variant="caption" muted style={footer}>
          A reminder due during quiet hours arrives when they end, as long as that is not after the
          task itself. Otherwise it is skipped.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Sound and vibration</SectionLabel>
        <Card style={{ paddingVertical: spacing.xs, gap: 0 }}>
          <ToggleRow
            label="Play a sound"
            checked={settings.sound}
            onChange={(sound) => update({ sound })}
          />
          {divider}
          <ToggleRow
            label="Vibrate"
            checked={settings.vibration}
            onChange={(vibration) => update({ vibration })}
          />
        </Card>
        <Text variant="caption" muted style={footer}>
          Your device settings and silent mode still apply. On iPhone, vibration is controlled in
          the device settings for Plank.
        </Text>
      </View>

      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Button label="Reset reminder settings" variant="plainDanger" inline onPress={reset} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
});
