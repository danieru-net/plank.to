import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useAppearance } from '@/features/appearance/context';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import { borderWidth, radius } from '@/theme';
import { CheckboxRow } from './CheckboxRow';
import { advanceOptions, parseClockTime, snoozeOptions } from './reminderSettings';
import { useReminderSettings } from './useReminderSettings';

/** Device-wide reminder choices: default notice, snooze, quiet hours, sound, and vibration. */
export function ReminderSettingsCard() {
  const { palette: theme, spacing } = useAppearance();
  const { settings, update, reset, error } = useReminderSettings();
  const { quietHours } = settings;
  const [drafts, setDrafts] = useState<{ start?: string; end?: string }>({});

  const startText = drafts.start ?? quietHours.start;
  const endText = drafts.end ?? quietHours.end;
  const startValid = parseClockTime(startText);
  const endValid = parseClockTime(endText);

  const changeTime = (which: 'start' | 'end', text: string) => {
    setDrafts((d) => ({ ...d, [which]: text }));
    const valid = parseClockTime(text);
    if (valid) update({ quietHours: { ...quietHours, [which]: valid } });
  };

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
      <Text variant="bodyStrong">Reminder settings</Text>
      <Text muted>
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
      />
      <Text muted>
        The Snooze button on a reminder asks once more after this long. It does not repeat on its
        own.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">Quiet hours</Text>
        <CheckboxRow
          label="Hold reminders during quiet hours"
          checked={quietHours.enabled}
          onChange={(enabled) => update({ quietHours: { ...quietHours, enabled } })}
        />
        <Text muted>
          A reminder due during quiet hours arrives when they end, as long as that is not after the
          task itself. Otherwise it is skipped.
        </Text>
        {quietHours.enabled ? (
          <>
            <TextField
              label="Quiet hours start"
              hint="24-hour time, like 22:00."
              value={startText}
              onChangeText={(t) => changeTime('start', t)}
              error={startValid ? undefined : 'Enter a time like 22:00.'}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
            <TextField
              label="Quiet hours end"
              hint="24-hour time, like 07:00."
              value={endText}
              onChangeText={(t) => changeTime('end', t)}
              error={endValid ? undefined : 'Enter a time like 07:00.'}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">Sound and vibration</Text>
        <CheckboxRow
          label="Play a sound"
          checked={settings.sound}
          onChange={(sound) => update({ sound })}
        />
        <CheckboxRow
          label="Vibrate"
          checked={settings.vibration}
          onChange={(vibration) => update({ vibration })}
        />
        <Text muted>
          Your device settings and silent mode still apply. On iPhone, vibration is controlled in
          the device settings for Plank.
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}
      <Button
        label="Reset reminder settings"
        variant="secondary"
        onPress={() => {
          setDrafts({});
          reset();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth, borderRadius: radius.md },
});
