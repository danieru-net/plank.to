import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { TimeField } from '@/components/TimeField';
import { StorageError } from '@/db/errors';
import {
  emptyForm,
  errorsFrom,
  formToInput,
  taskToForm,
  toLocalDateString,
  type TaskFormErrors,
  type TaskFormValues,
} from '@/features/tasks/taskForm';
import { useReconcileReminders } from '@/features/notifications/useReminderReconciler';
import { useTaskRepository } from '@/features/tasks/useTaskRepository';
import { useAppearance } from '@/features/appearance/context';

type Params = { id?: string };

export default function EditorScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { palette: theme } = useAppearance();
  const repo = useTaskRepository();
  const reconcile = useReconcileReminders();
  const editing = !!id;

  const [values, setValues] = useState<TaskFormValues>(() =>
    emptyForm(toLocalDateString(new Date())),
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    repo.getTask(id).then(
      (task) => {
        if (cancelled) return;
        if (task) setValues(taskToForm(task));
        else setLoadError('That task could not be found. It may have been deleted.');
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof StorageError ? e.message : 'Could not load this task.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, repo]);

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const input = formToInput(values);
      if (id) await repo.updateTask(id, input);
      else await repo.createTask(input);
      await reconcile();
      router.back();
    } catch (e) {
      const fieldErrors = errorsFrom(e);
      if (fieldErrors) setErrors(fieldErrors);
      else
        setSaveError(
          e instanceof StorageError ? e.message : 'Something went wrong. Your task was not saved.',
        );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert('Delete this task?', 'This cannot be undone.', [
      { text: 'Keep task', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          repo
            .deleteTask(id)
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
    ]);
  };

  const title = editing ? 'Edit task' : 'New task';

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
        <Text muted>Loading task…</Text>
      </Screen>
    );
  }

  return (
    <Screen keyboardDismissMode="on-drag">
      <Stack.Screen options={{ title }} />
      <TextField
        label="Title"
        value={values.title}
        onChangeText={(t) => set('title', t)}
        error={errors.title}
        placeholder="What would you like to do?"
        returnKeyType="next"
      />
      <TimeField
        label="Time (optional)"
        hint="Leave empty if it can happen any time."
        value={values.time}
        onChange={(t) => set('time', t)}
        error={errors.time}
        optional
      />

      {saveError ? (
        <Text accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {saveError}
        </Text>
      ) : null}
      <Button label={saving ? 'Saving…' : 'Save task'} onPress={onSave} disabled={saving} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      {editing ? <Button label="Delete task" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
