import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { StorageError } from '@/db/errors';
import type { OccurrenceOverride, Routine } from '@/db/routineRepository';
import {
  formToOccurrencePatch,
  occurrenceDetails,
  occurrenceErrorsFrom,
  occurrenceToForm,
  type OccurrenceFormErrors,
  type OccurrenceFormValues,
} from '@/features/routines/occurrenceForm';
import { resolveOccurrence, weekdaysToMask } from '@/features/routines/recurrence';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { useAppearance } from '@/features/appearance/context';
import { formatDateHeading } from '@/features/today/agenda';

type Params = { routineId?: string; date?: string };

/**
 * Changing one generated occurrence. The two choices are kept apart on purpose: the form below
 * stores an exception for this day only, and a separate button opens the whole routine.
 */
export default function OccurrenceScreen() {
  const { routineId, date: occurrenceDate } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const repo = useRoutineRepository();
  const reconcile = useReconcileReminders();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [override, setOverride] = useState<OccurrenceOverride | null>(null);
  const [values, setValues] = useState<OccurrenceFormValues | null>(null);
  const [errors, setErrors] = useState<OccurrenceFormErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!routineId || !occurrenceDate) {
      setLoadError('That day could not be found.');
      return;
    }
    try {
      const found = await repo.getRoutine(routineId);
      if (!found) {
        setLoadError('That routine could not be found. It may have been deleted.');
        return;
      }
      const overrides = await repo.listOccurrenceOverrides(routineId);
      const current = overrides.find((o) => o.occurrenceDate === occurrenceDate) ?? null;
      const occurrence = resolveOccurrence(
        {
          time: found.time,
          weekdays: weekdaysToMask(found.weekdays),
          startDate: found.startDate,
          paused: found.paused,
        },
        occurrenceDate,
        current ?? undefined,
      );
      setRoutine(found);
      setOverride(current);
      setValues(occurrenceToForm(occurrenceDetails(found, occurrence)));
    } catch (e) {
      setLoadError(e instanceof StorageError ? e.message : 'Could not load this day.');
    }
  }, [repo, routineId, occurrenceDate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const set = <K extends keyof OccurrenceFormValues>(key: K, value: OccurrenceFormValues[K]) => {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setSaveError(null);
    try {
      await action();
      await reconcile();
      router.back();
    } catch (e) {
      const fieldErrors = occurrenceErrorsFrom(e);
      if (fieldErrors) setErrors(fieldErrors);
      else
        setSaveError(
          e instanceof StorageError
            ? e.message
            : 'Something went wrong. That change was not saved.',
        );
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <Screen>
        <Text accessibilityRole="alert">Error: {loadError}</Text>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!routine || !values || !routineId || !occurrenceDate) {
    return (
      <Screen>
        <Text muted>Loading…</Text>
      </Screen>
    );
  }

  const skipped = override?.status === 'dismissed';

  return (
    <Screen keyboardDismissMode="on-drag">
      <Stack.Screen options={{ title: 'Change this day' }} />
      <Text variant="heading">{routine.title}</Text>
      <Text muted>{formatDateHeading(occurrenceDate)}</Text>

      <View style={{ gap: spacing.sm }} accessibilityRole="summary">
        <Text variant="bodyStrong">Only this day</Text>
        <Text muted>The routine and its other days stay the same.</Text>
      </View>
      <TextField
        label="Title"
        testID="occurrence-title"
        value={values.title}
        onChangeText={(t) => set('title', t)}
        error={errors.title}
      />
      <TextField
        label="Time"
        hint="Use 24-hour time, like 19:00."
        value={values.time}
        onChangeText={(t) => set('time', t)}
        error={errors.time}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />
      <TextField
        label="Date"
        hint="Year-month-day. Choose another date to move only this day."
        value={values.date}
        onChangeText={(t) => set('date', t)}
        error={errors.date}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />
      <TextField
        label="Notes"
        hint="Leave empty to use the routine’s notes."
        value={values.notes}
        onChangeText={(t) => set('notes', t)}
        error={errors.notes}
        multiline
        textAlignVertical="top"
      />

      {saveError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {saveError}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Saving…' : 'Save for this day only'}
        onPress={() =>
          run(() =>
            repo.saveOccurrence(
              routineId,
              occurrenceDate,
              formToOccurrencePatch(routine, occurrenceDate, values),
            ),
          )
        }
        disabled={saving}
      />
      <Button
        label={skipped ? 'Restore this day' : 'Skip this day'}
        variant="secondary"
        disabled={saving}
        onPress={() =>
          run(() =>
            repo.saveOccurrence(routineId, occurrenceDate, {
              status: skipped ? 'pending' : 'dismissed',
            }),
          )
        }
      />
      {override ? (
        <Button
          label="Undo changes for this day"
          variant="secondary"
          disabled={saving}
          onPress={() => run(() => repo.clearOccurrence(routineId, occurrenceDate))}
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">Every day of the routine</Text>
        <Text muted>Change the time, days, or title for the whole routine instead.</Text>
        <Button
          label="Edit the whole routine"
          variant="secondary"
          disabled={saving}
          onPress={() => router.replace({ pathname: '/routine', params: { id: routineId } })}
        />
      </View>
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
