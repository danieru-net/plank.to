import { Ionicons } from '@expo/vector-icons';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { useState } from 'react';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { useFeedback } from '@/features/appearance/feedback';
import { minTouchTarget, radius, tint } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Visible text; also the accessible name unless `accessibilityLabel` is set. */
  label: string;
  /**
   * primary: the one main action. secondary: soft accent fill. danger: filled, for confirming.
   * plain / plainDanger: text only, for quiet or destructive actions that should not shout.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'plain' | 'plainDanger';
  /** Optional Ionicons name shown before the label; decorative, the label stays the name. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Shrink to fit the label instead of stretching across the row. */
  inline?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  icon,
  inline = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const { palette: theme, spacing, motion } = useAppearance();
  const feedback = useFeedback();
  const [pressed, setPressed] = useState(false);
  const plain = variant === 'plain' || variant === 'plainDanger';
  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? tint(theme.primary, 0.12)
          : 'transparent';
  const foreground =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'danger'
        ? theme.onDanger
        : variant === 'plainDanger'
          ? theme.danger
          : theme.primary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        feedback.tap();
        onPress?.(e);
      }}
      style={{
        minHeight: minTouchTarget,
        minWidth: minTouchTarget,
        alignSelf: inline ? 'flex-start' : undefined,
        paddingVertical: spacing.sm,
        paddingHorizontal: plain ? spacing.sm : spacing.md,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
        opacity: disabled ? 0.5 : plain && pressed ? 0.6 : 1,
        // Plain buttons dim instead of shrinking; filled ones scale a touch when motion is on.
        transform: [{ scale: pressed && !plain && motion ? 0.97 : 1 }],
        transitionProperty: ['transform', 'opacity'],
        transitionDuration: motion ? 120 : 0,
        transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
      <Text variant="bodyStrong" style={{ color: foreground }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
