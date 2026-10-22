import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
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
  routineErrorsFrom,
  routineToForm,
  toggleWeekday,
  WEEKDAY_OPTIONS,
  type RoutineFormErrors,
  type RoutineFormValues,
} from '@/features/routines/routineForm';
import { ReminderFields } from '@/features/notifications/ReminderFields';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { PictureField, usePictureCleanup } from '@/features/pictures/PictureField';
import { useRoutineRepository } from '@/features/routines/useRoutineRepository';
import { toLocalDateString } from '@/features/tasks/taskForm';
import { minTouchTarget, radius, tint } from '@/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ date?: string; id?: string }>();
  const router = useRouter();
  const { palette: theme, spacing } = useAppearance();
  const repo = useRoutineRepository();
  const reconcile = useReconcileReminders();
  const pictures = usePictureCleanup();
  const [savedImageUri, setSavedImageUri] = useState<string | null>(null);

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
        if (routine) {
          setValues(routineToForm(routine));
          setSavedImageUri(routine.imageUri);
        } else setLoadError('That routine could not be found. It may have been deleted.');
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

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const input = formToRoutineInput({ ...values, reminderAdvanceMinutes: advanceMinutes });
      if (id) await repo.updateRoutine(id, input);
      else await repo.createRoutine(input);
      pictures.track(savedImageUri);
      await pictures.committed(input.imageUri ?? null);
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

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert(
      `Delete “${values.title}”?`,
      'This removes the routine and any changes you made to single days. This cannot be undone.',
      [
        { text: 'Keep routine', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            repo
              .deleteRoutine(id)
              .then(() => {
                pictures.track(savedImageUri);
                return pictures.committed(null);
              })
              .then(() => reconcile())
              .then(
                () => router.back(),
                (e: unknown) =>
                  setSaveError(
                    e instanceof StorageError
                      ? e.message
                      : 'Something went wrong. Nothing was deleted.',
                  ),
              );
          },
        },
      ],
    );
  };

  const title = editing ? 'Edit routine' : 'New routine';
  const header = (
    <Stack.Screen
      options={{
        title,
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
  if (loading) {
    return (
      <Screen>
        {header}
        <Text muted>Loading routine…</Text>
      </Screen>
    );
  }

  const presets: { label: string; days: number[] }[] = [
    { label: 'Every day', days: allWeekdays() },
    { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
    { label: 'Weekends', days: [0, 6] },
  ];
  const sameDays = (a: readonly number[], b: readonly number[]) =>
    a.length === b.length && a.every((d) => b.includes(d));

  return (
    <Screen keyboardDismissMode="on-drag" contentContainerStyle={{ gap: spacing.lg }}>
      {header}
      {editing ? (
        <InlineNotice message="Changes here apply to every day of this routine, except days you changed individually." />
      ) : null}
      <TextField
        label="Title"
        value={values.title}
        onChangeText={(t) => set('title', t)}
        error={errors.title}
        placeholder="What would you like to repeat?"
        returnKeyType="done"
      />
      <Card>
        <TimeField
          label="Time"
          value={values.time}
          onChange={(t) => set('time', t)}
          error={errors.time}
        />
      </Card>
      <PictureField
        symbol={values.symbol}
        imageUri={values.imageUri}
        onChangeSymbol={(s) => set('symbol', s)}
        onChangeImage={(uri) => set('imageUri', uri)}
        onPicked={pictures.track}
        error={errors.imageUri ?? errors.symbol}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyStrong">Repeats on</Text>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          {presets.map((p) => {
            const on = sameDays(values.weekdays, p.days);
            return (
              <Pressable
                key={p.label}
                accessibilityRole="checkbox"
                accessibilityLabel={p.label}
                accessibilityState={{ checked: on }}
                onPress={() => set('weekdays', on ? [] : p.days)}
                style={[
                  styles.chip,
                  {
                    paddingHorizontal: spacing.md,
                    gap: spacing.xs,
                    backgroundColor: on ? theme.primary : tint(theme.primary, 0.12),
                  },
                ]}
              >
                {on ? <Ionicons name="checkmark" size={16} color={theme.onPrimary} /> : null}
                <Text variant="bodyStrong" style={{ color: on ? theme.onPrimary : theme.primary }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={[styles.wrap, { gap: spacing.xs }]}
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
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  variant={selected ? 'bodyStrong' : 'body'}
                  style={{ color: selected ? theme.onPrimary : theme.text }}
                >
                  {short}
                </Text>
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

      <View style={{ gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More options"
          accessibilityState={{ expanded: advancedOpen }}
          onPress={() => setAdvancedOpen((o) => !o)}
          style={styles.advancedHeader}
        >
          <Text variant="bodyStrong">More options</Text>
          <Text variant="caption" muted style={styles.grow}>
            {'  '}Start date, notes, reminder
          </Text>
          <Ionicons
            name={advancedOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textMuted}
          />
        </Pressable>
        {advancedOpen ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <DateField
                label="Starts on"
                hint="Earlier days are not filled in."
                value={values.startDate}
                onChange={(t) => set('startDate', t)}
                error={errors.startDate}
              />
            </Card>
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

      {saveError ? <InlineNotice tone="error" message={saveError} /> : null}
      <Button label={saving ? 'Saving…' : 'Save routine'} onPress={onSave} disabled={saving} />
      {editing ? (
        <Button
          label="Delete routine"
          icon="trash-outline"
          variant="plainDanger"
          onPress={confirmDelete}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  advancedHeader: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
  grow: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    minHeight: minTouchTarget - 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    flexGrow: 1,
    minWidth: 44,
    minHeight: minTouchTarget,
    borderWidth: 1.5,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
