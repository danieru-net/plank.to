import { View } from 'react-native';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearance } from '@/features/appearance/context';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import { advanceOptions } from './reminderSettings';

type Props = {
  enabled: boolean;
  advanceMinutes: number;
  onChange: (patch: { enabled?: boolean; advanceMinutes?: number }) => void;
  error?: string;
  /** Shown instead of the notice choices when a reminder cannot work yet (for example, no time). */
  unavailableReason?: string;
};

/** Optional per-item reminder: an on/off checkbox and, when on, how long before to remind. */
export function ReminderFields({
  enabled,
  advanceMinutes,
  onChange,
  error,
  unavailableReason,
}: Props) {
  const { palette: theme, spacing } = useAppearance();
  // Keep a stored notice that is not one of the presets visible and selected.
  const options = advanceOptions.some((o) => o.value === advanceMinutes)
    ? advanceOptions
    : [...advanceOptions, { value: advanceMinutes, label: `${advanceMinutes} minutes before` }];
  return (
    <View style={{ gap: spacing.sm }}>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ToggleRow
          label="Remind me"
          description="Optional. A notification before the time you set."
          checked={enabled}
          onChange={(checked) => onChange({ enabled: checked })}
        />
      </Card>
      {enabled && unavailableReason ? <Text muted>{unavailableReason}</Text> : null}
      {enabled && !unavailableReason ? (
        <OptionGroup
          label="When to remind"
          options={options}
          value={advanceMinutes}
          onChange={(value) => onChange({ advanceMinutes: value })}
        />
      ) : null}
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}
    </View>
  );
}
