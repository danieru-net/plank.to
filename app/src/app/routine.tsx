import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { DateField, TimeField } from '@/components/TimeField';
import { StorageError } from '@/db/errors';
import { useAppearance } from '@/features/appearance/context';
import {
  allWeekdays,
  emptyRoutineForm,
  formToRoutineInput,
  isEveryDay,
  routineErrorsFrom,
  routineToForm,
  toggleWeekday,
  WEEKDAY_OPTIONS,
  type RoutineFormErrors,
  type RoutineFormValues,
} from '@/features/routines/routineForm';
import { ReminderFields } from '@/features/notifications/ReminderFields';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { borderWidth, minTouchTarget, radius } from '@/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ date?: string; id?: string }>();
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const repo = useRoutineRepository();
  const reconcile = useReconcileReminders();

  const [values, setValues] = useState<RoutineFormValues>(() =>
    // New routines default to starting today with a reminder 10 minutes before.
    ({ ...emptyRoutineForm(toLocalDateString(new Date()), 10), reminderEnabled: true }),
  );
  const [errors, setErrors] = useState<RoutineFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!id;
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    repo.getRoutine(id).then(
      (routine) => {
        if (cancelled) return;
        if (routine) setValues(routineToForm(routine));
        else setLoadError('That routine could not be found. It may have been deleted.');
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof StorageError ? e.message : 'Could not load this routine.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, repo]);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advanceMinutes = values.reminderAdvanceMinutes;

  const set = <K extends keyof RoutineFormValues>(key: K, value: RoutineFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const everyDay = isEveryDay(values.weekdays);

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const input = formToRoutineInput({ ...values, reminderAdvanceMinutes: advanceMinutes });
      if (id) await repo.updateRoutine(id, input);
      else await repo.createRoutine(input);
      await reconcile();
      router.back();
    } catch (e) {
      const fieldErrors = routineErrorsFrom(e);
      if (fieldErrors) setErrors(fieldErrors);
      else
        setSaveError(
          e instanceof StorageError
            ? e.message
            : 'Something went wrong. Your routine was not saved.',
        );
    } finally {
      setSaving(false);
    }
  };

  const title = editing ? 'Edit routine' : 'New routine';

  if (loadError) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <Text accessibilityRole="alert">Error: {loadError}</Text>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <Text muted>Loading routine…</Text>
      </Screen>
    );
  }

  return (
    <Screen keyboardDismissMode="on-drag">
      <Stack.Screen options={{ title }} />
      {editing ? (
        <Text muted>
          Changes here apply to every day of this routine, except days you changed individually.
        </Text>
      ) : null}
      <TextField
        label="Title"
        value={values.title}
        onChangeText={(t) => set('title', t)}
        error={errors.title}
        placeholder="What would you like to repeat?"
        returnKeyType="next"
      />
      <TimeField
        label="Time"
        value={values.time}
        onChange={(t) => set('time', t)}
        error={errors.time}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">Days</Text>
        <Button
          label="Every day"
          accessibilityRole="checkbox"
          accessibilityLabel="Every day"
          accessibilityState={{ checked: everyDay }}
          variant={everyDay ? 'primary' : 'secondary'}
          onPress={() => set('weekdays', everyDay ? [] : allWeekdays())}
        />
        <View
          style={[styles.days, { gap: spacing.sm }]}
          accessibilityRole="group"
          accessibilityLabel="Days of the week"
        >
          {WEEKDAY_OPTIONS.map(({ day, short, label }) => {
            const selected = values.weekdays.includes(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityLabel={label}
                accessibilityState={{ checked: selected }}
                onPress={() => set('weekdays', toggleWeekday(values.weekdays, day))}
                style={[
                  styles.day,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <Text variant={selected ? 'bodyStrong' : 'body'}>{short}</Text>
                {selected ? <Ionicons name="checkmark" size={16} color={theme.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
        {errors.weekdays ? (
          <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
            Error: {errors.weekdays}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Advanced"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((o) => !o)}
          style={styles.advancedHeader}
        >
          <Text variant="bodyStrong">Advanced</Text>
          <Ionicons
            name={advancedOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text}
          />
        </Pressable>
        {advancedOpen ? (
          <View style={{ gap: spacing.md }}>
            <DateField
              label="Starts on"
              hint="Earlier days are not filled in."
              value={values.startDate}
              onChange={(t) => set('startDate', t)}
              error={errors.startDate}
            />
            <TextField
              label="Notes (optional)"
              value={values.notes}
              onChangeText={(t) => set('notes', t)}
              error={errors.notes}
              multiline
              textAlignVertical="top"
            />

            <ReminderFields
              enabled={values.reminderEnabled}
              advanceMinutes={advanceMinutes}
              onChange={(p) => {
                if (p.enabled !== undefined) set('reminderEnabled', p.enabled);
                if (p.advanceMinutes !== undefined) {
                  set('reminderAdvanceMinutes', p.advanceMinutes);
                }
              }}
              error={errors.reminderAdvanceMinutes}
            />
          </View>
        ) : null}
      </View>

      {saveError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {saveError}
        </Text>
      ) : null}
      <Button label={saving ? 'Saving…' : 'Save routine'} onPress={onSave} disabled={saving} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  advancedHeader: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    borderWidth,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
  },
});
