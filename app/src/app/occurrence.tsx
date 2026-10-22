import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { DateField, TimeField } from '@/components/TimeField';
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
import { CaregiverGuard } from '@/features/caregiver/CaregiverGate';
import { formatDateHeading } from '@/features/today/agenda';

type Params = { routineId?: string; date?: string };

/**
 * Changing one generated occurrence. The two choices are kept apart on purpose: the form below
 * stores an exception for this day only, and a separate button opens the whole routine.
 */
export default function OccurrenceScreen() {
  const router = useRouter();
  return (
    <CaregiverGuard what="Changing a day" sticky onCancel={() => router.back()}>
      <OccurrenceScreenForm />
    </CaregiverGuard>
  );
}

function OccurrenceScreenForm() {
  const { routineId, date: occurrenceDate } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { spacing } = useAppearance();
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

  const header = (
    <Stack.Screen
      options={{
        title: 'Change this day',
        headerLeft: () => (
          <Button label="Cancel" variant="plain" inline onPress={() => router.back()} />
        ),
      }}
    />
  );

  if (loadError) {
    return (
      <Screen>
        {header}
        <InlineNotice tone="error" message={loadError} />
      </Screen>
    );
  }
  if (!routine || !values || !routineId || !occurrenceDate) {
    return (
      <Screen>
        {header}
        <Text muted>Loading…</Text>
      </Screen>
    );
  }

  const skipped = override?.status === 'dismissed';

  return (
    <Screen keyboardDismissMode="on-drag" contentContainerStyle={{ gap: spacing.lg }}>
      {header}
      <View style={{ gap: spacing.xs }}>
        <Text variant="heading">{routine.title}</Text>
        <Text muted>{formatDateHeading(occurrenceDate)}</Text>
      </View>

      <View style={{ gap: spacing.sm }} accessibilityRole="summary">
        <SectionLabel>Only this day</SectionLabel>
        <Text muted style={{ paddingHorizontal: spacing.md }}>
          The routine and its other days stay the same.
        </Text>
      </View>
      <TextField
        label="Title"
        testID="occurrence-title"
        value={values.title}
        onChangeText={(t) => set('title', t)}
        error={errors.title}
      />
      <Card style={{ gap: spacing.md }}>
        <TimeField
          label="Time"
          value={values.time}
          onChange={(t) => set('time', t)}
          error={errors.time}
        />
        <DateField
          label="Date"
          hint="Choose another date to move only this day."
          value={values.date}
          onChange={(t) => set('date', t)}
          error={errors.date}
        />
      </Card>
      <TextField
        label="Notes"
        hint="Leave empty to use the routine’s notes."
        value={values.notes}
        onChangeText={(t) => set('notes', t)}
        error={errors.notes}
        multiline
        textAlignVertical="top"
      />

      {saveError ? <InlineNotice tone="error" message={saveError} /> : null}
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
          variant="plain"
          disabled={saving}
          onPress={() => run(() => repo.clearOccurrence(routineId, occurrenceDate))}
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Every day of the routine</SectionLabel>
        <Text muted style={{ paddingHorizontal: spacing.md }}>
          Change the time, days, or title for the whole routine instead.
        </Text>
        <Button
          label="Edit the whole routine"
          variant="secondary"
          disabled={saving}
          onPress={() => router.replace({ pathname: '/routine', params: { id: routineId } })}
        />
      </View>
    </Screen>
  );
}
