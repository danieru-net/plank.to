import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InlineNotice } from '@/components/InlineNotice';
import { ListRow, ListSection } from '@/components/List';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { ToggleRow } from '@/components/ToggleRow';
import { useAppearanceControls } from '@/features/appearance/AppearanceProvider';
import { useAppearance } from '@/features/appearance/context';
import { OptionGroup } from '@/features/appearance/OptionGroup';
import { appearancePresets } from '@/features/appearance/presets';
import {
  completionMomentOptions,
  densityOptions,
  fontOptions,
  motionOptions,
  shapeFor,
  taskActionOptions,
  textScaleOptions,
} from '@/features/appearance/settings';
import { TaskPicture } from '@/features/pictures/TaskPicture';
import {
  colorThemeLabels,
  colorThemes,
  buildTypography,
  resolvePalette,
  type ColorTheme,
} from '@/theme';

const colorOptions = colorThemes.map((value) => ({ value, label: colorThemeLabels[value] }));

export default function AppearanceScreen() {
  const { settings, spacing } = useAppearance();
  const { update, reset, error } = useAppearanceControls();
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }}>
      <Preview />

      <ListSection
        title="Presets"
        footer="A preset only fills in the settings below. You can still change each one afterwards."
      >
        {appearancePresets.map((preset) => (
          <ListRow
            key={preset.id}
            title={preset.label}
            subtitle={preset.description}
            accessibilityLabel={`${preset.label}. ${preset.description}`}
            accessibilityHint="Applies these settings. You can change each one afterwards."
            onPress={() => update(preset.settings)}
          />
        ))}
      </ListSection>

      <OptionGroup
        label="Text size"
        options={textScaleOptions}
        value={settings.textScale}
        onChange={(textScale) => update({ textScale })}
        // Each choice is shown at the size it gives.
        labelStyle={(scale) => {
          const { fontSize, lineHeight } = buildTypography(
            scale,
            'system',
            settings.moreLineSpacing,
          ).body;
          return { fontSize, lineHeight };
        }}
      />

      <OptionGroup
        label="Font"
        options={fontOptions}
        value={settings.font}
        onChange={(font) => update({ font })}
        footer="Atkinson Hyperlegible was designed for easy reading, with letters that are hard to mix up. It is stored in the app, so it works offline."
      />

      <Card style={{ paddingVertical: spacing.xs }}>
        <ToggleRow
          label="More line spacing"
          description="Adds extra space between lines of text."
          checked={settings.moreLineSpacing}
          onChange={(moreLineSpacing) => update({ moreLineSpacing })}
        />
      </Card>

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

      <OptionGroup
        label="When a task is completed"
        options={completionMomentOptions}
        value={settings.completionMoment}
        onChange={(completionMoment) => update({ completionMoment })}
        footer="A short check, and optionally a soft sound that follows your device’s silent switch. The check is skipped when animations are off."
      />

      <Card style={{ paddingVertical: spacing.xs }}>
        <ToggleRow
          label="Pictures first"
          description="Shows each task’s photo or symbol large, above its title, for reading pictures before words."
          checked={settings.picturesFirst}
          onChange={(picturesFirst) => update({ picturesFirst })}
        />
        <ToggleRow
          label="Read aloud"
          description="Adds a Read aloud button to each task on Today. It speaks the title and notes, and you can stop it any time."
          checked={settings.readAloud}
          onChange={(readAloud) => update({ readAloud })}
        />
        <ToggleRow
          label="Simple mode"
          description="Shows only Today and Settings. Hides weather, clothing ideas and the Routines tab. Nothing is deleted, and routines you already set up still appear on their days."
          checked={settings.simpleMode}
          onChange={(simpleMode) => update({ simpleMode })}
        />
      </Card>

      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Button label="Reset appearance" variant="plainDanger" inline onPress={reset} />
    </Screen>
  );
}

/** A sample task drawn with the current settings, so changes are visible straight away. */
function Preview() {
  const { palette: theme, shape, spacing, settings } = useAppearance();
  const { picturesFirst } = settings;
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>Preview</SectionLabel>
      {/* The frame is painted with the theme's own background and given a border, so the tint reads even though the screen behind it is tinted too. */}
      <View
        style={[
          styles.frame,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            borderRadius: shape.radius.card + spacing.sm,
            padding: spacing.md,
            gap: spacing.md,
          },
        ]}
      >
        <Card style={[styles.row, { gap: spacing.sm }]}>
          <Text variant="bodyStrong" tabular>
            07:30
          </Text>
          {!picturesFirst ? <TaskPicture symbol="shower" imageUri={null} size={36} /> : null}
          <View style={[styles.grow, { gap: spacing.xs }]}>
            {picturesFirst ? <TaskPicture symbol="shower" imageUri={null} size={96} /> : null}
            <Text>Shower</Text>
          </View>
          <View
            style={[
              styles.dot,
              {
                width: shape.iconSize + 6,
                height: shape.iconSize + 6,
                borderRadius: (shape.iconSize + 6) / 2,
                borderColor: theme.border,
              },
            ]}
          />
        </Card>
        {/* A sample button shows the theme's primary color and button corners. */}
        <View
          style={[
            styles.sampleButton,
            { backgroundColor: theme.primary, borderRadius: shape.radius.button },
          ]}
        >
          <Text variant="bodyStrong" style={{ color: theme.onPrimary }}>
            Complete
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Background, surface and accent of a color theme, so it can be judged without trying it. */
function Swatch({ theme }: { theme: ColorTheme }) {
  const { scheme } = useAppearance();
  const p = resolvePalette(theme, scheme);
  const shape = shapeFor(theme);
  // Corners follow the theme's card radius, kept small enough for the compact size.
  const outer = Math.min(SWATCH_HEIGHT / 2, shape.radius.card / 2);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.swatch,
        { backgroundColor: p.background, borderColor: p.border, borderRadius: outer },
      ]}
    >
      <View
        style={[
          styles.swatchSurface,
          { backgroundColor: p.surface, borderColor: p.separator, borderRadius: outer - 3 },
        ]}
      >
        <View
          style={[
            styles.swatchAccent,
            { backgroundColor: p.primary, borderRadius: Math.min(5, shape.radius.button / 4) },
          ]}
        />
      </View>
    </View>
  );
}

const SWATCH_HEIGHT = 32;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  frame: { borderWidth: 1 },
  sampleButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { borderWidth: 2 },
  swatch: {
    width: 44,
    height: SWATCH_HEIGHT,
    borderWidth: 1,
    padding: 3,
  },
  swatchSurface: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchAccent: { width: 16, height: 10 },
});
