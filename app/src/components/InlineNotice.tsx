import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { radius, tint } from '@/theme';

type Props = {
  /** "error" is announced as an alert and starts with "Error:", so it never relies on color. */
  tone?: 'info' | 'error';
  title?: string;
  message: string;
  /** Buttons shown under the message. */
  children?: ReactNode;
};

/** A calm, tinted note for errors, permissions, and other things that need a moment's attention. */
export function InlineNotice({ tone = 'info', title, message, children }: Props) {
  const { palette: theme, spacing } = useAppearance();
  const error = tone === 'error';
  const color = error ? theme.danger : theme.primary;
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: tint(color, 0.1), padding: spacing.md, gap: spacing.sm },
      ]}
    >
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Ionicons
          name={error ? 'alert-circle-outline' : 'information-circle-outline'}
          size={22}
          color={color}
          style={styles.icon}
        />
        <View style={[styles.body, { gap: spacing.xs }]}>
          {title ? <Text variant="bodyStrong">{title}</Text> : null}
          <Text accessibilityRole={error ? 'alert' : undefined} style={error ? { color } : null}>
            {error ? `Error: ${message}` : message}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { marginTop: 1 },
  body: { flex: 1 },
});
