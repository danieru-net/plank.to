import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { useState } from 'react';

import { Text } from './Text';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Visible text; also the accessible name unless `accessibilityLabel` is set. */
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Optional Ionicons name shown before the label; decorative, the label stays the name. */
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Soft tint of a #rrggbb color, used for secondary buttons. */
function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const { palette: theme, spacing } = useAppearance();
  const [pressed, setPressed] = useState(false);
  const filled = variant !== 'secondary';
  const fill = variant === 'danger' ? theme.danger : theme.primary;
  const textColor = variant === 'danger' ? theme.onDanger : theme.onPrimary;
  const accent = theme.primary;

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
        if (process.env.EXPO_OS === 'ios')
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={{
        minHeight: minTouchTarget,
        minWidth: minTouchTarget,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? fill : tint(accent, 0.12),
        opacity: disabled ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        transitionProperty: ['transform', 'opacity'],
        transitionDuration: 120,
        transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={filled ? textColor : accent} /> : null}
      <Text variant="bodyStrong" style={{ color: filled ? textColor : accent }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
