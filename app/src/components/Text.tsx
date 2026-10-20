import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useAppearance } from '@/features/appearance/context';
import { typography, type TextVariant } from '@/theme';

type Props = RNTextProps & {
  variant?: TextVariant;
  muted?: boolean;
};

export function Text({ variant = 'body', muted = false, style, ...rest }: Props) {
  const { palette: theme, settings, maxFontMultiplier } = useAppearance();
  const base = typography[variant];
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={maxFontMultiplier}
      accessibilityRole={variant === 'heading' ? 'header' : undefined}
      {...rest}
      style={[
        {
          ...base,
          fontSize: base.fontSize * settings.textScale,
          lineHeight: base.lineHeight * settings.textScale,
        },
        { color: muted ? theme.textMuted : theme.text },
        style,
      ]}
    />
  );
}
