import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { borderWidth, minTouchTarget, radius, typography } from '@/theme';

type Props = Omit<TextInputProps, 'style'> & {
  /** Visible label, shown above the input and used as the accessible name. */
  label: string;
  hint?: string;
  /** Validation message. Shown as text, not by color alone. */
  error?: string;
};

export function TextField({ label, hint, error, onFocus, onBlur, ...rest }: Props) {
  const { palette: theme, spacing, settings, maxFontMultiplier } = useAppearance();
  const [focused, setFocused] = useState(false);

  // The input carries the label and hint, so screen readers skip the visible copies above it
  // instead of reading each one twice.
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodyStrong" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" muted accessibilityElementsHidden importantForAccessibility="no">
          {hint}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        allowFontScaling
        maxFontSizeMultiplier={maxFontMultiplier}
        placeholderTextColor={theme.textMuted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            fontSize: typography.body.fontSize * settings.textScale,
            lineHeight: typography.body.lineHeight * settings.textScale,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : focused ? theme.focus : theme.border,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
          Error: {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: minTouchTarget,
    borderWidth,
    borderRadius: radius.md,
  },
});
