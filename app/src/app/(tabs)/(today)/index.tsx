import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { createRoutineTasksForDate } from '@/features/routines/routineTasks';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { useTaskRepository } from '@/features/tasks/useTaskRepository';
import { formatDateHeading, groupAgenda, nextTaskId } from '@/features/today/agenda';
import { TaskItem } from '@/features/today/TaskItem';
import { TodaySummary } from '@/features/today/TodaySummary';
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
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const refresh = useCallback(async () => {
    const date = toLocalDateString(new Date());
    setToday(date);
    try {
      // Routines scheduled for today become tasks, so the list below is only tasks.
      if ((await createRoutineTasksForDate(repo, routineRepo, date)) > 0) await reconcile();
      setTasks(await repo.listTasksForDate(date));
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

  const renderItem = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      next={t.id === next}
      onOpen={() => router.push({ pathname: '/editor', params: { id: t.id } })}
      onComplete={() => act((r) => r.completeTask(t.id))}
      onReopen={() => act((r) => r.reopenTask(t.id))}
      onDismiss={() => act((r) => r.dismissTask(t.id))}
    />
  );

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
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
            <ListSection title="Scheduled">{timed.map(renderItem)}</ListSection>
          ) : null}
          {untimed.length > 0 ? (
            <ListSection title="Any time">{untimed.map(renderItem)}</ListSection>
          ) : null}
          {allDone ? (
            <View style={[styles.closing, { gap: spacing.sm, paddingVertical: spacing.md }]}>
              <Ionicons name="checkmark-done-outline" size={28} color={theme.primary} />
              <Text variant="bodyStrong" style={styles.center}>
                Nothing else planned for today.
              </Text>
            </View>
          ) : null}
          <Button label="Add a task" icon="add" variant="plain" inline onPress={addTask} />
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
              {showDone ? <ListSection>{doneTasks.map(renderItem)}</ListSection> : null}
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
