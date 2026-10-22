import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { InlineNotice } from '@/components/InlineNotice';
import { ListSection } from '@/components/List';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StorageError } from '@/db/errors';
import type { Task, TaskRepository } from '@/db/taskRepository';
import { useAppearance } from '@/features/appearance/context';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { ReminderPermissionCard } from '@/features/notifications/ReminderPermissionCard';
import { loadRoutineChanges, type RoutineChange } from '@/features/routines/routineChanges';
import { createRoutineTasksForDate } from '@/features/routines/routineTasks';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { useTaskRepository } from '@/features/tasks/useTaskRepository';
import { formatDateHeading, groupAgenda, moveItem, nextTaskId } from '@/features/today/agenda';
import { TaskItem } from '@/features/today/TaskItem';
import { TodaySummary } from '@/features/today/TodaySummary';
import { useReorder } from '@/features/today/useReorder';
import { minTouchTarget } from '@/theme';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

export default function TodayScreen() {
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const repo = useTaskRepository();
  const routineRepo = useRoutineRepository();
  const reconcile = useReconcileReminders();
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [changes, setChanges] = useState<RoutineChange[]>([]);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const refresh = useCallback(async () => {
    const date = toLocalDateString(new Date());
    setToday(date);
    try {
      // Routines scheduled for today become tasks, so the list below is only tasks.
      if ((await createRoutineTasksForDate(repo, routineRepo, date)) > 0) await reconcile();
      const [dayTasks, dayChanges] = await Promise.all([
        repo.listTasksForDate(date),
        loadRoutineChanges(routineRepo, date),
      ]);
      setTasks(dayTasks);
      setChanges(dayChanges);
      setLoad({ status: 'ready' });
    } catch (e) {
      setLoad({
        status: 'error',
        message: e instanceof StorageError ? e.message : 'Could not load today’s tasks.',
      });
    }
  }, [repo, routineRepo, reconcile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const act = async (run: (r: TaskRepository) => Promise<unknown>) => {
    setActionError(null);
    try {
      await run(repo);
    } catch (e) {
      setActionError(
        e instanceof StorageError ? e.message : 'Something went wrong. That change was not saved.',
      );
    }
    await Promise.all([refresh(), reconcile()]);
  };

  const addTask = () => router.push({ pathname: '/editor', params: { date: today } });

  const { timed, untimed } = groupAgenda(tasks.filter((t) => t.status === 'pending'));
  const finished = groupAgenda(tasks.filter((t) => t.status !== 'pending'));
  const doneTasks = [...finished.timed, ...finished.untimed];
  const next = nextTaskId(timed, new Date());
  const nothingPlanned = tasks.length === 0;
  const allDone = !nothingPlanned && timed.length === 0 && untimed.length === 0;

  /** Shows the new order of the untimed tasks still to do straight away, then saves it. */
  const moveUntimed = (from: number, to: number) => {
    const order = moveItem(untimed, from, to);
    setTasks((prev) => [...prev.filter((t) => !order.includes(t)), ...order]);
    void act((r) =>
      r.reorderUntimedTasks(
        today,
        order.map((t) => t.id),
      ),
    );
  };
  const reorder = useReorder({ onMove: moveUntimed });

  const renderItem = (t: Task, extra?: Partial<ComponentProps<typeof TaskItem>>) => (
    <TaskItem
      key={t.id}
      task={t}
      next={t.id === next}
      onOpen={() => router.push({ pathname: '/editor', params: { id: t.id } })}
      onComplete={() => act((r) => r.completeTask(t.id))}
      onReopen={() => act((r) => r.reopenTask(t.id))}
      onDismiss={() => act((r) => r.dismissTask(t.id))}
      {...extra}
    />
  );

  const renderUntimed = (t: Task, i: number) =>
    untimed.length < 2
      ? renderItem(t)
      : reorder.row(i, t.id, (handle) =>
          renderItem(t, {
            handle,
            onMoveUp: i > 0 ? () => moveUntimed(i, i - 1) : undefined,
            onMoveDown: i < untimed.length - 1 ? () => moveUntimed(i, i + 1) : undefined,
          }),
        );

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }} scrollEnabled={!reorder.dragging}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a task"
              onPress={addTask}
              hitSlop={8}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={28} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <Text variant="bodyStrong" muted style={{ marginTop: -spacing.sm }}>
        {formatDateHeading(today)}
      </Text>
      {load.status === 'ready' && changes.length > 0 ? (
        <InlineNotice
          title="What changed today"
          message={changes.map((c) => c.message).join('\n')}
        />
      ) : null}
      <TodaySummary />

      {actionError ? <InlineNotice tone="error" message={actionError} /> : null}
      {load.status === 'loading' ? <Text muted>Loading today’s tasks…</Text> : null}
      {load.status === 'error' ? (
        <InlineNotice tone="error" message={load.message}>
          <Button label="Try again" variant="secondary" inline onPress={() => void refresh()} />
        </InlineNotice>
      ) : null}

      {load.status === 'ready' && nothingPlanned ? (
        <EmptyState
          title="Nothing planned for today"
          message="Add a task whenever you like. Routines you set up appear here on their days."
          actionLabel="Add a task"
          onAction={addTask}
        />
      ) : null}

      {load.status === 'ready' && !nothingPlanned ? (
        <>
          {timed.length > 0 ? (
            <ListSection title="Scheduled">{timed.map((t) => renderItem(t))}</ListSection>
          ) : null}
          {untimed.length > 0 ? (
            <ListSection title="Any time">{untimed.map(renderUntimed)}</ListSection>
          ) : null}
          {allDone ? (
            <View style={[styles.closing, { gap: spacing.sm, paddingVertical: spacing.md }]}>
              <Ionicons name="checkmark-done-outline" size={28} color={theme.primary} />
              <Text variant="bodyStrong" style={styles.center}>
                Nothing else planned for today.
              </Text>
            </View>
          ) : null}
          {doneTasks.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Done, ${doneTasks.length} ${doneTasks.length === 1 ? 'task' : 'tasks'}`}
                accessibilityState={{ expanded: showDone }}
                onPress={() => setShowDone((s) => !s)}
                style={[styles.disclosure, { paddingHorizontal: spacing.md, gap: spacing.sm }]}
              >
                <Text
                  variant="caption"
                  muted
                  style={{ fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}
                >
                  Done ({doneTasks.length})
                </Text>
                <Ionicons
                  name={showDone ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.textMuted}
                />
              </Pressable>
              {showDone ? <ListSection>{doneTasks.map((t) => renderItem(t))}</ListSection> : null}
            </View>
          ) : null}
        </>
      ) : null}

      <ReminderPermissionCard placement="today" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closing: { alignItems: 'center' },
  center: { textAlign: 'center' },
  disclosure: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center' },
});
