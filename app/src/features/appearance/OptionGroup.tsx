import { Ionicons } from '@expo/vector-icons';
import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { minTouchTarget, type TextVariant } from '@/theme';
import { useAppearance } from './context';

type Props<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Optional preview before each label, such as a color swatch. */
  leading?: (value: T) => ReactNode;
  /** Optional per-option text style, such as showing each text size at that size. */
  labelStyle?: (value: T) => object | undefined;
  footer?: string;
};

/**
 * A labelled single-choice group, drawn as a grouped list. The selected option shows a check
 * mark and bold text, not just color.
 */
export function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  leading,
  labelStyle,
  footer,
}: Props<T>) {
  const { palette: theme, spacing } = useAppearance();
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <SectionLabel>{label}</SectionLabel>
      <Card flush>
        {options.map((o, i) => {
          const selected = o.value === value;
          const variant: TextVariant = selected ? 'bodyStrong' : 'body';
          return (
            <Fragment key={String(o.value)}>
              {i > 0 ? (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: theme.separator,
                    marginLeft: spacing.md,
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ selected }}
                onPress={() => onChange(o.value)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    gap: spacing.md,
                    backgroundColor: pressed ? theme.separator : undefined,
                  },
                ]}
              >
                {leading?.(o.value)}
                <Text variant={variant} style={[styles.optionText, labelStyle?.(o.value)]}>
                  {o.label}
                </Text>
                <Ionicons
                  name="checkmark"
                  size={22}
                  color={theme.primary}
                  style={{ opacity: selected ? 1 : 0 }}
                />
              </Pressable>
            </Fragment>
          );
        })}
      </Card>
      {footer ? (
        <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: { flex: 1 },
});
