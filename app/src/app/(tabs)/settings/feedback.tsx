import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { parseFeedbackKind } from '@/features/feedback/feedbackKind';
import { FEEDBACK_EMAIL } from '@/features/feedback/support';

const titles = {
  idea: 'Suggest an idea',
  improvement: 'Suggest an improvement',
  problem: 'Report a problem',
} as const;

// Placeholder until the feedback form (message, device details, mail composer) is built.
export default function FeedbackScreen() {
  const kind = parseFeedbackKind(useLocalSearchParams<{ kind?: string }>().kind);
  return (
    <Screen>
      <Stack.Screen options={{ title: titles[kind] }} />
      <Text>
        {kind === 'problem'
          ? 'Tell us what happened and what you were trying to do.'
          : 'Tell us what would make the app work better for you.'}
      </Text>
      <Text muted>You can email us at</Text>
      <Text selectable accessibilityHint="Long press to copy the address">
        {FEEDBACK_EMAIL}
      </Text>
    </Screen>
  );
}
