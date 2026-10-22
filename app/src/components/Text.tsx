import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useAppearance } from '@/features/appearance/context';
import type { TextVariant } from '@/theme';

type Props = RNTextProps & {
  variant?: TextVariant;
  muted?: boolean;
  /** Equal-width digits, so times and temperatures line up in a column. */
  tabular?: boolean;
};

export function Text({ variant = 'body', muted = false, tabular = false, style, ...rest }: Props) {
  const { palette: theme, typography, maxFontMultiplier } = useAppearance();
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontMultiplier}
      accessibilityRole={variant === 'heading' ? 'header' : undefined}
      {...rest}
      style={[
        typography[variant],
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        { color: muted ? theme.textMuted : theme.text },
        style,
      ]}
    />
  );
}
