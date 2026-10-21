import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { Task } from '@/db/taskRepository';
import { useAppearance } from '@/features/appearance/context';
import { useFeedback } from '@/features/appearance/feedback';
import { minTouchTarget, tint } from '@/theme';
import { statusText } from './agenda';

type Props = {
  task: Task;
  /** Marks the next timed task still to do, with the word "Next" (not color alone). */
  next?: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onDismiss: () => void;
};

/** How long the filled check shows before the task moves to Done, when motion is on. */
const SETTLE_MS = 350;

/**
 * One task in Today's grouped list: time and title. Actions follow the "Task
 * actions" setting: a check circle plus a menu, or labelled buttons. Either way the same actions
 * are offered to screen readers as named actions on the row.
 */
export function TaskItem({ task, next, onOpen, onComplete, onReopen, onDismiss }: Props) {
  const { palette: theme, spacing, settings, motion } = useAppearance();
  const feedback = useFeedback();
  const status = statusText(task.status);
  const pending = task.status === 'pending';
  const editable = task.routineId === null;
  const compact = settings.taskActions === 'compact';
  const [settling, setSettling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const complete = () => {
    feedback.success();
    if (!motion) return onComplete();
    setSettling(true);
    timer.current = setTimeout(onComplete, SETTLE_MS);
  };

  const openMenu = () => {
    const items: { label: string; run: () => void }[] = [];
    if (editable) items.push({ label: 'Edit', run: onOpen });
    if (pending) items.push({ label: 'Dismiss for today', run: onDismiss });
    else items.push({ label: `Undo ${status?.toLowerCase()}`, run: onReopen });
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: task.title,
          options: [...items.map((i) => i.label), 'Cancel'],
          cancelButtonIndex: items.length,
        },
        (index) => items[index]?.run(),
      );
    } else {
      Alert.alert(task.title, undefined, [
        ...items.map((i) => ({ text: i.label, onPress: i.run })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const done = !pending || settling;
  const undoLabel = `Undo ${status?.toLowerCase()} for ${task.title}`;
  const rowLabel = `${task.title}${task.time ? `, ${task.time}` : ', any time'}${next ? ', next' : ''}${status ? `, ${status}` : ''}${editable ? '. Edit' : ''}`;

  return (
    <Animated.View layout={motion ? LinearTransition.duration(200) : undefined}>
      <View
        style={[
          styles.row,
          { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
        ]}
      >
        {compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pending ? `Complete ${task.title}` : undoLabel}
            disabled={settling}
            onPress={pending ? complete : onReopen}
            hitSlop={4}
            style={styles.check}
          >
            {done && task.status !== 'dismissed' ? (
              <Animated.View entering={settling && motion ? ZoomIn.springify() : undefined}>
                <Ionicons name="checkmark-circle" size={30} color={theme.primary} />
              </Animated.View>
            ) : task.status === 'dismissed' ? (
              <Ionicons name="remove-circle-outline" size={30} color={theme.textMuted} />
            ) : (
              <Ionicons name="ellipse-outline" size={30} color={theme.border} />
            )}
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel={rowLabel}
          accessibilityRole={editable ? 'button' : 'text'}
          accessibilityActions={[
            ...(pending
              ? [
                  { name: 'complete', label: 'Complete' },
                  { name: 'dismiss', label: 'Dismiss for today' },
                ]
              : [{ name: 'reopen', label: 'Undo' }]),
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'complete') onComplete();
            if (e.nativeEvent.actionName === 'dismiss') onDismiss();
            if (e.nativeEvent.actionName === 'reopen') onReopen();
          }}
          disabled={!editable}
          onPress={onOpen}
          style={({ pressed }) => [styles.main, { gap: spacing.sm, opacity: pressed ? 0.6 : 1 }]}
        >
          {task.time ? (
            <Text
              variant="bodyStrong"
              tabular
              muted={done}
              style={{ minWidth: 52 * settings.textScale }}
            >
              {task.time}
            </Text>
          ) : null}
          <View style={styles.body}>
            <Text muted={done} style={done && !settling ? styles.struck : undefined}>
              {task.title}
            </Text>
            {status || !editable || next ? (
              <View style={[styles.meta, { gap: spacing.xs }]}>
                {next ? (
                  <Text
                    variant="caption"
                    style={[
                      styles.pill,
                      { color: theme.primary, backgroundColor: tint(theme.primary, 0.12) },
                    ]}
                  >
                    Next
                  </Text>
                ) : null}
                <Text variant="caption" muted>
                  {[!editable ? 'Routine' : null, status].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        {compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More actions for ${task.title}`}
            onPress={openMenu}
            style={styles.more}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!compact ? (
        <View
          style={[
            styles.actions,
            { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
          ]}
        >
          {pending ? (
            <>
              <Button
                label="Complete"
                icon="checkmark-circle-outline"
                accessibilityLabel={`Complete ${task.title}`}
                inline
                onPress={complete}
              />
              <Button
                label="Dismiss"
                icon="close-circle-outline"
                variant="secondary"
                accessibilityLabel={`Dismiss ${task.title}`}
                inline
                onPress={onDismiss}
              />
            </>
          ) : (
            <Button
              label="Undo"
              variant="secondary"
              accessibilityLabel={undoLabel}
              inline
              onPress={onReopen}
            />
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  check: {
    minWidth: minTouchTarget - 8,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  body: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  pill: {
    fontWeight: '600',
    paddingHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  struck: { textDecorationLine: 'line-through' },
  more: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
