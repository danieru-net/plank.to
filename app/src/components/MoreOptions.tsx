import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget } from '@/theme';

type Props = {
  /** What is inside, shown next to the header, such as "Picture, notes, reminder". */
  summary: string;
  /** Opens the section so an error inside it is never hidden. */
  forceOpen?: boolean;
  /** Starts open, for example when a template has filled in fields inside. */
  initiallyOpen?: boolean;
  children: ReactNode;
};

/** A collapsed "More options" section for optional fields, closed until it is opened. */
export function MoreOptions({
  summary,
  forceOpen = false,
  initiallyOpen = false,
  children,
}: Props) {
  const { palette: theme, spacing } = useAppearance();
  const [toggled, setToggled] = useState(initiallyOpen);
  const open = toggled || forceOpen;
  return (
    <View style={{ gap: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityHint={summary}
        accessibilityState={{ expanded: open }}
        onPress={() => setToggled(!open)}
        style={styles.header}
      >
        <Text variant="bodyStrong">More options</Text>
        <Text variant="caption" muted style={styles.grow}>
          {'  '}
          {summary}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textMuted} />
      </Pressable>
      {open ? <View style={{ gap: spacing.lg }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
