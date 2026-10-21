import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { diagnosticLines, readDeviceDetails } from '@/features/feedback/diagnostics';
import { parseFeedbackKind, type FeedbackKind } from '@/features/feedback/feedbackKind';
import { FEEDBACK_EMAIL } from '@/features/feedback/support';

const titles: Record<FeedbackKind, string> = {
  idea: 'Suggest an idea',
  improvement: 'Suggest an improvement',
  problem: 'Report a problem',
};

const kindOptions: { value: FeedbackKind; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'problem', label: 'Problem' },
];

const messagePrompts: Record<FeedbackKind, { label: string; hint: string }> = {
  idea: { label: 'Your idea', hint: 'What would you like the app to do?' },
  improvement: { label: 'Your suggestion', hint: 'What could work better, and how?' },
  problem: { label: 'What happened?', hint: 'Describe what you saw.' },
};

// The form for an idea, improvement or problem. Sending through the mail composer comes next.
export default function FeedbackScreen() {
  const { settings, spacing } = useAppearance();
  const initialKind = parseFeedbackKind(useLocalSearchParams<{ kind?: string }>().kind);
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [includeDetails, setIncludeDetails] = useState(true);
  const details = useMemo(() => diagnosticLines(readDeviceDetails(settings)), [settings]);
  const prompt = messagePrompts[kind];

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: titles[kind] }} />
      <Screen contentContainerStyle={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Type</SectionLabel>
          <SegmentedControl
            label="Feedback type"
            options={kindOptions}
            value={kind}
            onChange={setKind}
          />
        </View>

        <TextField
          label={prompt.label}
          hint={prompt.hint}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
        />

        {kind === 'problem' ? (
          <TextField
            label="What were you trying to do? (optional)"
            hint="For example: adding a routine for school days."
            value={context}
            onChangeText={setContext}
            multiline
            textAlignVertical="top"
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Card style={{ paddingVertical: spacing.xs }}>
            <ToggleRow
              label="Include device details"
              description="Helps us understand problems. Your tasks, routines and location are never included."
              checked={includeDetails}
              onChange={setIncludeDetails}
            />
          </Card>
          {includeDetails ? (
            <Card accessible accessibilityLabel={previewLabel(details)}>
              <Text variant="bodyStrong">These details will be added</Text>
              {details.map((d) => (
                <View key={d.label} style={[styles.detail, { gap: spacing.sm }]}>
                  <Text muted style={styles.detailLabel}>
                    {d.label}
                  </Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              ))}
            </Card>
          ) : (
            <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
              No device details will be added. Only what you write is sent.
            </Text>
          )}
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text muted>Sending from the app is coming soon. Until then, you can email us at</Text>
          <Text selectable accessibilityHint="Long press to copy the address">
            {FEEDBACK_EMAIL}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function previewLabel(details: { label: string; value: string }[]): string {
  return `These details will be added. ${details.map((d) => `${d.label}: ${d.value}`).join('. ')}.`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  detail: { flexDirection: 'row', flexWrap: 'wrap' },
  detailLabel: { minWidth: 110 },
  detailValue: { flex: 1, minWidth: 140 },
});
