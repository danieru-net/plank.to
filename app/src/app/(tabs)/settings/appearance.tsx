import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearanceControls } from '@/features/appearance/AppearanceProvider';
import { useAppearance } from '@/features/appearance/context';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import {
  densityOptions,
  motionOptions,
  taskActionOptions,
  textScaleOptions,
} from '@/features/appearance/settings';
import {
  colorThemeLabels,
  colorThemes,
  resolvePalette,
  typography,
  type ColorTheme,
} from '@/theme';

const colorOptions = colorThemes.map((value) => ({ value, label: colorThemeLabels[value] }));

export default function AppearanceScreen() {
  const { settings, spacing } = useAppearance();
  const { update, reset, error } = useAppearanceControls();
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <Preview />

      <OptionGroup
        label="Text size"
        options={textScaleOptions}
        value={settings.textScale}
        onChange={(textScale) => update({ textScale })}
        // Each choice is shown at the size it gives.
        labelStyle={(scale) => ({
          fontSize: typography.body.fontSize * scale,
          lineHeight: typography.body.lineHeight * scale,
        })}
      />

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Spacing</SectionLabel>
        <SegmentedControl
          label="Spacing"
          options={densityOptions}
          value={settings.density}
          onChange={(density) => update({ density })}
        />
      </View>

      <OptionGroup
        label="Colors"
        options={colorOptions}
        value={settings.colorTheme}
        onChange={(colorTheme) => update({ colorTheme })}
        leading={(theme) => <Swatch theme={theme} />}
      />

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>Animations</SectionLabel>
        <SegmentedControl
          label="Animations"
          options={motionOptions}
          value={settings.motion}
          onChange={(motion) => update({ motion })}
        />
        <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
          “Match device” follows Reduce Motion in your device settings.
        </Text>
      </View>

      {process.env.EXPO_OS === 'ios' ? (
        <Card style={{ paddingVertical: spacing.xs }}>
          <ToggleRow
            label="Haptic feedback"
            description="A light tap you can feel when you press buttons or complete a task."
            checked={settings.haptics}
            onChange={(haptics) => update({ haptics })}
          />
        </Card>
      ) : null}

      <OptionGroup
        label="Task actions"
        options={taskActionOptions}
        value={settings.taskActions}
        onChange={(taskActions) => update({ taskActions })}
        footer="Labelled buttons show Complete and Dismiss under every task on Today."
      />

      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Button label="Reset appearance" variant="plainDanger" inline onPress={reset} />
    </Screen>
  );
}

/** A sample task drawn with the current settings, so changes are visible straight away. */
function Preview() {
  const { palette: theme, spacing, settings } = useAppearance();
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Preview</SectionLabel>
      <Card style={[styles.row, { gap: spacing.sm }]}>
        <Text variant="bodyStrong" tabular>
          07:30
        </Text>
        <Text style={{ fontSize: 24 * settings.textScale, lineHeight: 30 * settings.textScale }}>
          🚿
        </Text>
        <Text style={styles.grow}>Shower</Text>
        <View style={[styles.dot, { borderColor: theme.border }]} />
      </Card>
    </View>
  );
}

/** Background, surface and accent of a color theme, so it can be judged without trying it. */
function Swatch({ theme }: { theme: ColorTheme }) {
  const { scheme } = useAppearance();
  const p = resolvePalette(theme, scheme);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.swatch, { backgroundColor: p.background, borderColor: p.border }]}
    >
      <View style={[styles.swatchAccent, { backgroundColor: p.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchAccent: { width: 14, height: 14, borderRadius: 7 },
});
