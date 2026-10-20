import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StorageError } from '@/db/errors';
import type { Routine } from '@/db/routineRepository';
import { useAppearance } from '@/features/appearance/context';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { routineSummary, weekdaysSpoken } from '@/features/routines/routineSummary';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { borderWidth, radius } from '@/theme';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

export default function RoutinesScreen() {
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const repo = useRoutineRepository();
  const reconcile = useReconcileReminders();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRoutines(await repo.listRoutines());
      setLoad({ status: 'ready' });
    } catch (e) {
      setLoad({
        status: 'error',
        message: e instanceof StorageError ? e.message : 'Could not load your routines.',
      });
    }
  }, [repo]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const act = async (run: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await run();
    } catch (e) {
      setActionError(
        e instanceof StorageError ? e.message : 'Something went wrong. That change was not saved.',
      );
    }
    await Promise.all([refresh(), reconcile()]);
  };

  const confirmDelete = (r: Routine) => {
    Alert.alert(
      `Delete “${r.title}”?`,
      'This removes the routine and any changes you made to single days. This cannot be undone.',
      [
        { text: 'Keep routine', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void act(() => repo.deleteRoutine(r.id)),
        },
      ],
    );
  };

  const today = toLocalDateString(new Date());

  return (
    <Screen>
      <Text muted>
        Pause a routine to hide it from Today and stop its reminders. Resuming brings it back from
        today on.
      </Text>
      {load.status === 'ready' && routines.length > 0 ? (
        <Button
          label="Add a routine"
          variant="secondary"
          onPress={() => router.push({ pathname: '/routine', params: { date: today } })}
        />
      ) : null}
      {actionError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {actionError}
        </Text>
      ) : null}
      {load.status === 'loading' ? <Text muted>Loading routines…</Text> : null}
      {load.status === 'error' ? (
        <>
          <Text accessibilityRole="alert" style={{ color: theme.danger }}>
            Error: {load.message}
          </Text>
          <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
        </>
      ) : null}
      {load.status === 'ready' && routines.length === 0 ? (
        <EmptyState
          title="No routines yet"
          message="A routine repeats on the weekdays you choose."
          actionLabel="Add a routine"
          onAction={() => router.push({ pathname: '/routine', params: { date: today } })}
        />
      ) : null}
      {load.status === 'ready'
        ? routines.map((r) => (
            <View
              key={r.id}
              accessibilityRole="summary"
              style={{
                borderWidth,
                borderRadius: radius.md,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Text variant="bodyStrong">{r.title}</Text>
              <Text
                muted
                accessibilityLabel={`${r.time}, ${weekdaysSpoken(r.weekdays)}${r.paused ? ', paused' : ''}`}
              >
                {routineSummary(r)}
              </Text>
              <Button
                label="Edit"
                accessibilityLabel={`Edit ${r.title}`}
                variant="secondary"
                onPress={() => router.push({ pathname: '/routine', params: { id: r.id } })}
              />
              <Button
                label={r.paused ? 'Resume' : 'Pause'}
                accessibilityLabel={`${r.paused ? 'Resume' : 'Pause'} ${r.title}`}
                variant="secondary"
                onPress={() =>
                  void act(() => (r.paused ? repo.resumeRoutine(r.id) : repo.pauseRoutine(r.id)))
                }
              />
              <Button
                label="Delete"
                accessibilityLabel={`Delete ${r.title}`}
                variant="danger"
                onPress={() => confirmDelete(r)}
              />
            </View>
          ))
        : null}
    </Screen>
  );
}
