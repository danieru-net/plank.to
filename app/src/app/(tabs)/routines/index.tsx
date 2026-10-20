import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { InlineNotice } from '@/components/InlineNotice';
import { ListSection } from '@/components/List';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { StorageError } from '@/db/errors';
import type { Routine } from '@/db/routineRepository';
import { useAppearance } from '@/features/appearance/context';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { weekdaysSpoken } from '@/features/routines/routineSummary';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { WeekdayDots } from '@/features/routines/WeekdayDots';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { minTouchTarget } from '@/theme';

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

  const today = toLocalDateString(new Date());
  const addRoutine = () => router.push({ pathname: '/routine', params: { date: today } });

  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a routine"
              onPress={addRoutine}
              hitSlop={8}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={28} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      {actionError ? <InlineNotice tone="error" message={actionError} /> : null}
      {load.status === 'loading' ? <Text muted>Loading routines…</Text> : null}
      {load.status === 'error' ? (
        <InlineNotice tone="error" message={load.message}>
          <Button label="Try again" variant="secondary" inline onPress={() => void refresh()} />
        </InlineNotice>
      ) : null}
      {load.status === 'ready' && routines.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="No routines yet"
          message="A routine repeats on the weekdays you choose, like “Shower, 19:00, every day”."
          actionLabel="Add a routine"
          onAction={addRoutine}
        />
      ) : null}
      {load.status === 'ready' && routines.length > 0 ? (
        <ListSection footer="Switch a routine off to pause it: it leaves Today and its reminders stop. Switching it back on brings it back from today.">
          {routines.map((r) => {
            const spoken = `${r.time}, ${weekdaysSpoken(r.weekdays)}${r.paused ? ', paused' : ''}`;
            return (
              <View
                key={r.id}
                style={[
                  styles.row,
                  { paddingLeft: spacing.md, paddingRight: spacing.sm, gap: spacing.sm },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${r.title}, ${spoken}`}
                  onPress={() => router.push({ pathname: '/routine', params: { id: r.id } })}
                  style={({ pressed }) => [
                    styles.main,
                    { gap: spacing.md, paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text variant="title" tabular muted={r.paused}>
                    {r.time}
                  </Text>
                  <View style={[styles.grow, { gap: spacing.xs }]}>
                    <Text variant="bodyStrong" muted={r.paused}>
                      {r.title}
                    </Text>
                    <WeekdayDots days={r.weekdays} dimmed={r.paused} />
                    {r.paused ? (
                      <Text variant="caption" muted>
                        Paused
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={`${r.title} is active`}
                  accessibilityHint="Turn off to pause this routine"
                  accessibilityState={{ checked: !r.paused }}
                  onPress={() =>
                    void act(() => (r.paused ? repo.resumeRoutine(r.id) : repo.pauseRoutine(r.id)))
                  }
                  style={styles.switch}
                >
                  <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                    <Switch
                      value={!r.paused}
                      trackColor={{ true: theme.primary, false: theme.separator }}
                      ios_backgroundColor={theme.separator}
                      accessibilityElementsHidden
                    />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ListSection>
      ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: minTouchTarget },
  grow: { flex: 1 },
  switch: { minHeight: minTouchTarget, minWidth: minTouchTarget, justifyContent: 'center' },
});
