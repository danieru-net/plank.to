import { Pressable, StyleSheet, View } from 'react-native';

import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { occurrenceStatusText } from '@/features/routines/occurrenceForm';
import type { RoutineOccurrence } from '@/features/routines/routineAgenda';
import { minTouchTarget } from '@/theme';

type Props = { item: RoutineOccurrence; onOpen: () => void };

/** A routine's occurrence on Today. Opening it offers "only this day" or "whole routine". */
export function RoutineOccurrenceItem({ item, onOpen }: Props) {
  const { occurrence, details } = item;
  const status = occurrenceStatusText(occurrence);
  const inactive = occurrence.status !== 'pending';
  return (
    <Animated.View entering={FadeInDown.duration(220)} layout={LinearTransition}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${details.title}, routine, ${details.time}${status ? `, ${status}` : ''}. Change`}
        onPress={onOpen}
      >
        <Card style={styles.card}>
          <View style={styles.body}>
            <Text
              variant="bodyStrong"
              muted={inactive}
              style={inactive ? styles.struck : undefined}
            >
              {details.title}
            </Text>
            <Text variant="caption" muted>
              {details.time} · Routine{status ? ` · ${status}` : ''}
            </Text>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
  },
  body: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
});
