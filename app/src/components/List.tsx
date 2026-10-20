import { Ionicons } from '@expo/vector-icons';
import { Children, Fragment, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
} from 'react-native';

import { Card } from './Card';
import { SectionLabel } from './SectionLabel';
import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget } from '@/theme';

type SectionProps = {
  title?: string;
  /** Short explanation under the group, in muted text. */
  footer?: string;
  children: ReactNode;
};

/** Rows grouped on one surface with hairline separators, instead of a card per row. */
export function ListSection({ title, footer, children }: SectionProps) {
  const { palette: theme, spacing } = useAppearance();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      <Card flush>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.separator,
                  marginLeft: spacing.md,
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </Card>
      {footer ? (
        <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  /** Shown at the start of the row, such as an icon or symbol. */
  leading?: ReactNode;
  /** Shown at the end of the row, such as a value or a switch. */
  trailing?: ReactNode;
  /** Shows a chevron, for rows that open another screen. */
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
};

/** One row in a ListSection. Pressable rows highlight their background rather than shrinking. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
}: RowProps) {
  const { palette: theme, spacing } = useAppearance();
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        <Text>{title}</Text>
        {subtitle ? (
          <Text variant="caption" muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textMuted} /> : null}
    </>
  );
  const rowStyle = {
    minHeight: minTouchTarget + spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  };
  if (!onPress) {
    return <View style={[styles.row, rowStyle]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        rowStyle,
        pressed ? { backgroundColor: theme.separator } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, gap: 2 },
});
