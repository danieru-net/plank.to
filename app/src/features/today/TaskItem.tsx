import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import type { Task } from '@/db/taskRepository';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget } from '@/theme';
import { statusText } from './agenda';

type Props = {
  task: Task;
  onOpen: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onDismiss: () => void;
};

export function TaskItem({ task, onOpen, onComplete, onReopen, onDismiss }: Props) {
  const { spacing, settings } = useAppearance();
  const status = statusText(task.status);
  const pending = task.status === 'pending';
  const editable = task.routineId === null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} layout={LinearTransition}>
      <Card>
        <Pressable
          accessibilityLabel={`${task.title}${task.time ? `, ${task.time}` : ', any time'}${status ? `, ${status}` : ''}${editable ? '. Edit' : ''}`}
          accessibilityRole={editable ? 'button' : 'text'}
          disabled={!editable}
          onPress={onOpen}
          style={[styles.main, { gap: spacing.sm }]}
        >
          {task.symbol ? (
            <Text
              style={{ fontSize: 28 * settings.textScale, lineHeight: 36 * settings.textScale }}
            >
              {task.symbol}
            </Text>
          ) : null}
          <View style={styles.body}>
            <Text
              variant="bodyStrong"
              style={task.status === 'pending' ? undefined : styles.struck}
              muted={!pending}
            >
              {task.title}
            </Text>
            <Text variant="caption" muted>
              {task.time ?? 'Any time'}
              {status ? ` · ${status}` : ''}
            </Text>
          </View>
        </Pressable>
        <View style={[styles.actions, { gap: spacing.sm }]}>
          {pending ? (
            <>
              <Button
                label="Complete"
                icon="checkmark-circle-outline"
                accessibilityLabel={`Complete ${task.title}`}
                onPress={onComplete}
              />
              <Button
                label="Dismiss"
                icon="close-circle-outline"
                variant="secondary"
                accessibilityLabel={`Dismiss ${task.title}`}
                onPress={onDismiss}
              />
            </>
          ) : (
            <Button
              label="Undo"
              variant="secondary"
              accessibilityLabel={`Undo ${status?.toLowerCase()} for ${task.title}`}
              onPress={onReopen}
            />
          )}
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  main: { flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  body: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
