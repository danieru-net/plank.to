import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { diagnosticLines, readDeviceDetails } from '@/features/feedback/diagnostics';
import { parseFeedbackKind, type FeedbackKind } from '@/features/feedback/feedbackKind';
import { buildFeedbackMessage } from '@/features/feedback/feedbackMessage';
import { sendFeedback, type SendOutcome } from '@/features/feedback/sendFeedback';
import { FEEDBACK_EMAIL } from '@/features/feedback/support';
import { useFeedbackDraft } from '@/features/feedback/useFeedbackDraft';

// Shown once after the mail composer reports Sent, with no follow-up prompts or rating requests.
const SENT_TITLE = 'Thanks — we read every message';
const UNAVAILABLE_TITLE = 'No mail app found';
const UNAVAILABLE_MESSAGE =
  'You can still email us yourself. Copy the address below, then paste your message into any email app.';

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

// The form for an idea, improvement or problem, sent through the user's own mail app.
export default function FeedbackScreen() {
  const { settings, spacing } = useAppearance();
  const initialKind = parseFeedbackKind(useLocalSearchParams<{ kind?: string }>().kind);
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState('');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const draft = useFeedbackDraft();
  const edited = useRef(false);
  const details = useMemo(() => diagnosticLines(readDeviceDetails(settings)), [settings]);
  const prompt = messagePrompts[kind];
  const canSend = message.trim().length > 0 && !sending;

  // Bring back an unsent message, unless the user already started typing a new one.
  useEffect(() => {
    if (!draft.restored || edited.current) return;
    setKind(draft.restored.kind);
    setMessage(draft.restored.message);
    setContext(draft.restored.context);
    setIncludeDetails(draft.restored.includeDetails);
  }, [draft.restored]);

  const { loaded, save } = draft;
  useEffect(() => {
    if (loaded) save({ kind, message, context, includeDetails });
  }, [loaded, save, kind, message, context, includeDetails]);

  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      edited.current = true;
      set(value);
    };
  }

  async function send() {
    setSending(true);
    const email = buildFeedbackMessage({ kind, message, context, includeDetails }, details);
    const result = await sendFeedback(FEEDBACK_EMAIL, email);
    setSending(false);
    setOutcome(result);
    if (result === 'sent') {
      draft.clear();
      AccessibilityInfo.announceForAccessibility(SENT_TITLE);
    } else if (result === 'unavailable') {
      // The notice appears above the button, behind the screen reader's focus, so read it out.
      AccessibilityInfo.announceForAccessibility(`${UNAVAILABLE_TITLE}. ${UNAVAILABLE_MESSAGE}`);
    }
  }

  async function copyAddress() {
    try {
      await Clipboard.setStringAsync(FEEDBACK_EMAIL);
      setCopied(true);
      AccessibilityInfo.announceForAccessibility('Address copied');
    } catch {
      // The address stays on screen as selectable text.
    }
  }

  if (outcome === 'sent') {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Feedback' }} />
        <EmptyState
          icon="checkmark-circle-outline"
          title={SENT_TITLE}
          message="Your message is on its way."
          actionLabel="Done"
          actionIcon="checkmark"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // iOS insets the scroll view by the keyboard and keeps the focused field in view. Android draws
  // edge to edge, so the window may not resize for the keyboard; padding makes room instead.
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior="padding"
      enabled={process.env.EXPO_OS === 'android'}
    >
      <Stack.Screen options={{ title: titles[kind] }} />
      <Screen
        contentContainerStyle={{ gap: spacing.lg }}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Type</SectionLabel>
          <SegmentedControl
            label="Feedback type"
            options={kindOptions}
            value={kind}
            onChange={edit(setKind)}
          />
        </View>

        <TextField
          label={prompt.label}
          hint={prompt.hint}
          value={message}
          onChangeText={edit(setMessage)}
          multiline
          textAlignVertical="top"
        />

        {kind === 'problem' ? (
          <TextField
            label="What were you trying to do? (optional)"
            hint="For example: adding a routine for school days."
            value={context}
            onChangeText={edit(setContext)}
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
              onChange={edit(setIncludeDetails)}
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

        {outcome === 'unavailable' ? (
          <InlineNotice title={UNAVAILABLE_TITLE} message={UNAVAILABLE_MESSAGE}>
            <Text selectable accessibilityHint="Long press to copy the address">
              {FEEDBACK_EMAIL}
            </Text>
            <Button
              label={copied ? 'Address copied' : 'Copy address'}
              icon={copied ? 'checkmark' : 'copy-outline'}
              variant="secondary"
              inline
              onPress={copyAddress}
            />
          </InlineNotice>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Button
            label={sending ? 'Opening mail…' : 'Open in mail app'}
            icon="mail-outline"
            disabled={!canSend}
            onPress={send}
            accessibilityHint={
              message.trim()
                ? 'Opens your mail app with this message filled in'
                : 'Write a message first'
            }
          />
          <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
            {outcome === 'handedOff'
              ? 'If you sent your message, thanks — we read every message.'
              : message.trim()
                ? 'Nothing is sent until you press Send in your mail app.'
                : 'Write a message first.'}
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
