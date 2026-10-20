import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius, tint } from '@/theme';
import { TASK_SYMBOLS } from './taskForm';

type Props = {
  value: string | null;
  onChange: (symbol: string | null) => void;
};

/**
 * An optional picture for a task, chosen from large tiles. The selected tile has a thick outline
 * and a check mark, not just a color change.
 */
export function SymbolPicker({ value, onChange }: Props) {
  const { palette: theme, spacing, settings } = useAppearance();
  const size = Math.round(56 * Math.min(settings.textScale, 1.3));
  const options = [{ symbol: null, label: 'No symbol' }, ...TASK_SYMBOLS];
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodyStrong">Symbol (optional)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel="Symbol"
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
      >
        {options.map((o) => {
          const selected = o.symbol === value;
          return (
            <Pressable
              key={o.label}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(o.symbol)}
              style={[
                styles.tile,
                {
                  width: size,
                  height: size,
                  minWidth: minTouchTarget,
                  backgroundColor: selected ? tint(theme.primary, 0.12) : theme.surface,
                  borderColor: selected ? theme.primary : theme.separator,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              {o.symbol ? (
                <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{o.symbol}</Text>
              ) : (
                <Ionicons name="remove" size={24} color={theme.textMuted} />
              )}
              {selected ? (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="checkmark" size={12} color={theme.onPrimary} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
