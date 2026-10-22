import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { Task } from '@/db/taskRepository';
import { completionPlan } from '@/features/appearance/completionMoment';
import { playCompletionSound } from '@/features/appearance/completionSound';
import { useAppearance } from '@/features/appearance/context';
import { useFeedback } from '@/features/appearance/feedback';
import { pictureLabel, TaskPicture } from '@/features/pictures/TaskPicture';
import { ReadAloudButton } from '@/features/speech/ReadAloudButton';
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
  /** Set for untimed tasks still to do that can move up or down in the list. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** A drag handle shown at the end of the row, for tasks that can be reordered. */
  handle?: ReactNode;
};

/** How long the filled check shows before the task moves to Done, when motion is on. */
const SETTLE_MS = 350;

/**
 * One task in Today's grouped list: time, picture or symbol, and title. With "Pictures first"
 * the picture is shown large above the title. Actions follow the "Task
 * actions" setting: a check circle plus a menu, or labelled buttons. Either way the same actions
 * are offered to screen readers as named actions on the row.
 */
export function TaskItem({
  task,
  next,
  onOpen,
  onComplete,
  onReopen,
  onDismiss,
  onMoveUp,
  onMoveDown,
  handle,
}: Props) {
  const { palette: theme, spacing, settings, motion } = useAppearance();
  const feedback = useFeedback();
  const status = statusText(task.status);
  const pending = task.status === 'pending';
  const editable = task.routineId === null;
  const compact = settings.taskActions === 'compact';
  const picturesFirst = settings.picturesFirst;
  const [settling, setSettling] = useState(false);
  // Whether the optional completion check is showing while the task settles.
  const [check, setCheck] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const complete = () => {
    feedback.success();
    const plan = completionPlan(settings.completionMoment, motion);
    if (plan.sound) playCompletionSound();
    if (!motion) return onComplete();
    setCheck(plan.check);
    setSettling(true);
    timer.current = setTimeout(onComplete, SETTLE_MS);
  };

  const openMenu = () => {
    const items: { label: string; run: () => void }[] = [];
    if (editable) items.push({ label: 'Edit', run: onOpen });
    if (onMoveUp) items.push({ label: 'Move up', run: onMoveUp });
    if (onMoveDown) items.push({ label: 'Move down', run: onMoveDown });
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
  const symbolLabel = pictureLabel(task.symbol, task.imageUri);
  const rowLabel = `${task.title}${symbolLabel ? `, ${symbolLabel}` : ''}${task.time ? `, ${task.time}` : ', any time'}${next ? ', next' : ''}${status ? `, ${status}` : ''}${editable ? '. Edit' : ''}`;

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
            ...(onMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
            ...(onMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'complete') onComplete();
            if (e.nativeEvent.actionName === 'dismiss') onDismiss();
            if (e.nativeEvent.actionName === 'reopen') onReopen();
            if (e.nativeEvent.actionName === 'moveUp') onMoveUp?.();
            if (e.nativeEvent.actionName === 'moveDown') onMoveDown?.();
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
          {!picturesFirst ? (
            <TaskPicture symbol={task.symbol} imageUri={task.imageUri} size={36} muted={done} />
          ) : null}
          <View style={[styles.body, picturesFirst ? { gap: spacing.xs } : null]}>
            {picturesFirst ? (
              <TaskPicture symbol={task.symbol} imageUri={task.imageUri} size={96} muted={done} />
            ) : null}
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
        {handle}
      </View>

      {settling && check ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.moment, { backgroundColor: tint(theme.primary, 0.1) }]}
        >
          <Ionicons name="checkmark-circle" size={44} color={theme.primary} />
        </Animated.View>
      ) : null}

      {settings.readAloud ? (
        <View
          style={[styles.actions, { paddingHorizontal: spacing.md, paddingBottom: spacing.sm }]}
        >
          <ReadAloudButton task={task} />
        </View>
      ) : null}

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
              {onMoveUp ? (
                <Button
                  label="Move up"
                  icon="arrow-up"
                  variant="secondary"
                  accessibilityLabel={`Move ${task.title} up`}
                  inline
                  onPress={onMoveUp}
                />
              ) : null}
              {onMoveDown ? (
                <Button
                  label="Move down"
                  icon="arrow-down"
                  variant="secondary"
                  accessibilityLabel={`Move ${task.title} down`}
                  inline
                  onPress={onMoveDown}
                />
              ) : null}
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
  moment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
