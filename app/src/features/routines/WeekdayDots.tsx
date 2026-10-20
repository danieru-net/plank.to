import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { WEEKDAY_OPTIONS } from './routineForm';

/**
 * A row of seven small day letters; days the routine repeats are filled. Decorative: callers
 * give the spoken summary (fill vs outline is a shape cue, not color alone).
 */
export function WeekdayDots({ days, dimmed }: { days: readonly number[]; dimmed?: boolean }) {
  const { palette: theme, settings } = useAppearance();
  const size = Math.round(20 * Math.min(settings.textScale, 1.3));
  return (
    <View
      style={[styles.row, { opacity: dimmed ? 0.55 : 1 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {WEEKDAY_OPTIONS.map(({ day, short }) => {
        const on = days.includes(day);
        return (
          <View
            key={day}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: on ? theme.primary : 'transparent',
                borderColor: on ? theme.primary : theme.separator,
              },
            ]}
          >
            <Text
              variant="caption"
              maxFontSizeMultiplier={1}
              style={{
                fontSize: size * 0.5,
                lineHeight: size * 0.62,
                fontWeight: '600',
                color: on ? theme.onPrimary : theme.textMuted,
              }}
            >
              {short.charAt(0)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  dot: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
