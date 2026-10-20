import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { borderWidth, minTouchTarget, radius } from '@/theme';

type Mode = 'time' | 'date';

type Props = {
  label: string;
  hint?: string;
  /** "HH:mm" for time, "YYYY-MM-DD" for date; empty when nothing is chosen. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Shows a clear button when a value is set. */
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

function PickerField({
  mode,
  label,
  hint,
  value,
  onChange,
  error,
  optional,
}: Props & { mode: Mode }) {
  const { palette: theme, spacing } = useAppearance();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parse(mode, value));

  const show = () => {
    setDraft(parse(mode, value));
    setOpen(true);
  };

  const onAndroid = (e: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (e.type === 'set' && date) onChange(format(mode, date));
  };

  const icon = mode === 'time' ? 'time-outline' : 'calendar-outline';

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodyStrong">{label}</Text>
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View
          style={[
            styles.input,
            {
              paddingHorizontal: spacing.md,
              backgroundColor: theme.surface,
              borderColor: error ? theme.danger : theme.border,
            },
          ]}
        >
          <Text style={value ? undefined : { color: theme.textMuted }}>
            {value || (mode === 'time' ? 'No time set' : 'No date set')}
          </Text>
        </View>
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
            style={styles.iconButton}
          >
            <Ionicons name="close-circle-outline" size={24} color={theme.textMuted} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label}`}
          onPress={show}
          style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name={icon} size={24} color={theme.primary} />
        </Pressable>
      </View>
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker mode={mode} is24Hour value={parse(mode, value)} onChange={onAndroid} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
            onPress={() => setOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: theme.surface, padding: spacing.md }]}>
            <Text variant="bodyStrong">{label}</Text>
            <DateTimePicker
              mode={mode}
              is24Hour
              display="spinner"
              value={draft}
              onChange={(_, d) => d && setDraft(d)}
              textColor={theme.text}
            />
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Done"
                onPress={() => {
                  onChange(format(mode, draft));
                  setOpen(false);
                }}
              />
              <Button label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: minTouchTarget,
    justifyContent: 'center',
    borderWidth,
    borderRadius: radius.md,
  },
  iconButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: 12 },
});
