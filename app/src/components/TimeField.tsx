import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius, tint } from '@/theme';

type Mode = 'time' | 'date';

type Props = {
  label: string;
  hint?: string;
  /** "HH:mm" for time, "YYYY-MM-DD" for date; empty when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Allows no value: adds a clear button once a value is set. */
  optional?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function parse(mode: Mode, value: string): Date {
  const d = new Date();
  if (mode === 'time') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value);
    d.setHours(m ? Number(m[1]) : 9, m ? Number(m[2]) : 0, 0, 0);
  } else {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) d.setFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(12, 0, 0, 0);
  }
  return d;
}

function format(mode: Mode, d: Date): string {
  return mode === 'time'
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A readable date for the Android button, such as "Tue 20 Oct 2026". */
function display(mode: Mode, value: string): string {
  if (mode === 'time') return value;
  return parse(mode, value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * A labelled time or date row. iOS uses the system's compact picker (a pill that opens the native
 * wheel or calendar in place); Android opens the system dialog. No custom modal.
 */
function PickerField({
  mode,
  label,
  hint,
  value,
  onChange,
  error,
  optional,
}: Props & { mode: Mode }) {
  const { palette: theme, spacing, scheme } = useAppearance();
  const [androidOpen, setAndroidOpen] = useState(false);
  const empty = !value;
  const noun = mode === 'time' ? 'time' : 'date';
  // An empty field shows a button rather than a picker, so it never displays a value it lacks.
  const addLabel = optional ? `Add a ${noun}` : `Choose a ${noun}`;

  const onAndroid = (e: DateTimePickerEvent, date?: Date) => {
    setAndroidOpen(false);
    if (e.type === 'set' && date) onChange(format(mode, date));
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={styles.label}>
          <Text variant="bodyStrong">{label}</Text>
          {hint ? (
            <Text variant="caption" muted>
              {hint}
            </Text>
          ) : null}
        </View>

        {empty ? (
          <Button
            label={addLabel}
            accessibilityLabel={`${addLabel} for ${label}`}
            icon="add"
            variant="secondary"
            inline
            onPress={() =>
              Platform.OS === 'android'
                ? setAndroidOpen(true)
                : onChange(format(mode, parse(mode, '')))
            }
          />
        ) : Platform.OS === 'ios' ? (
          <DateTimePicker
            mode={mode}
            display="compact"
            // The app shows times as 24-hour everywhere; keep the picker consistent.
            locale={mode === 'time' ? 'en_GB' : undefined}
            value={parse(mode, value)}
            onChange={(_, d) => d && onChange(format(mode, d))}
            accentColor={theme.primary}
            themeVariant={scheme}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? display(mode, value) : 'not set'}. Change`}
            onPress={() => setAndroidOpen(true)}
            style={[styles.pill, { backgroundColor: tint(theme.primary, 0.12) }]}
          >
            <Text variant="bodyStrong" tabular style={{ color: theme.primary }}>
              {value ? display(mode, value) : 'Choose'}
            </Text>
          </Pressable>
        )}

        {optional && !empty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
            style={styles.iconButton}
          >
            <Ionicons name="close-circle" size={22} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}

      {androidOpen && Platform.OS === 'android' ? (
        <DateTimePicker mode={mode} is24Hour value={parse(mode, value)} onChange={onAndroid} />
      ) : null}
    </View>
  );
}

export function TimeField(props: Props) {
  return <PickerField mode="time" {...props} />;
}

export function DateField(props: Props) {
  return <PickerField mode="date" {...props} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  label: { flex: 1, gap: 2 },
  pill: {
    minHeight: minTouchTarget,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  iconButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
