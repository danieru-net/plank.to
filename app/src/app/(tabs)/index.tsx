import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { StorageError } from '@/db/errors';
import type { Task, TaskRepository } from '@/db/taskRepository';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { ReminderPermissionCard } from '@/features/notifications/ReminderPermissionCard';
import { createRoutineTasksForDate } from '@/features/routines/routineTasks';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { useTaskRepository } from '@/features/tasks/useTaskRepository';
import { formatDateHeading, groupAgenda } from '@/features/today/agenda';
import { TaskItem } from '@/features/today/TaskItem';
import { TodaySummary } from '@/features/today/TodaySummary';
import { useTheme } from '@/theme';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

export default function TodayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const repo = useTaskRepository();
  const routineRepo = useRoutineRepository();
  const reconcile = useReconcileReminders();
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);

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

  const { timed, untimed } = groupAgenda(tasks.filter((t) => t.status === 'pending'));
  const completed = groupAgenda(tasks.filter((t) => t.status === 'completed'));
  const completedTasks = [...completed.timed, ...completed.untimed];
  const dismissed = groupAgenda(tasks.filter((t) => t.status === 'dismissed'));
  const dismissedTasks = [...dismissed.timed, ...dismissed.untimed];
  const nothingPlanned = tasks.length === 0;

  const renderItem = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      onOpen={() => router.push({ pathname: '/editor', params: { id: t.id } })}
      onComplete={() => act((r) => r.completeTask(t.id))}
      onReopen={() => act((r) => r.reopenTask(t.id))}
      onDismiss={() => act((r) => r.dismissTask(t.id))}
    />
  );

  return (
    <Screen>
      <Text variant="heading">{formatDateHeading(today)}</Text>
      <TodaySummary />
      <ReminderPermissionCard placement="today" />
      {actionError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {actionError}
        </Text>
      ) : null}
      {load.status === 'loading' ? <Text muted>Loading today’s tasks…</Text> : null}
      {load.status === 'error' ? (
        <>
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            Error: {load.message}
          </Text>
          <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
        </>
      ) : null}
      {load.status === 'ready' && nothingPlanned ? (
        <EmptyState
          title="Nothing planned for today"
          message="Add a task whenever you like."
          actionLabel="Add a task"
          onAction={() => router.push({ pathname: '/editor', params: { date: today } })}
        />
      ) : null}
      {load.status === 'ready' && !nothingPlanned ? (
        <>
          {timed.length > 0 ? <SectionLabel>Scheduled</SectionLabel> : null}
          {timed.map(renderItem)}
          {untimed.length > 0 ? <SectionLabel>Any time</SectionLabel> : null}
          {untimed.map(renderItem)}
          {completedTasks.length > 0 ? <SectionLabel>Completed</SectionLabel> : null}
          {completedTasks.map(renderItem)}
          {dismissedTasks.length > 0 ? <SectionLabel>Dismissed</SectionLabel> : null}
          {dismissedTasks.map(renderItem)}
          <Button
            label="Add a task"
            variant="secondary"
            onPress={() => router.push({ pathname: '/editor', params: { date: today } })}
          />
        </>
      ) : null}
    </Screen>
  );
}
