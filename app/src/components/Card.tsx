import { View, type ViewProps } from 'react-native';

import { useAppearance } from '@/features/appearance/context';
import { cardShadow, radius } from '@/theme';

type Props = ViewProps & {
  /** No padding or gap, for grouped lists whose rows bring their own padding. */
  flush?: boolean;
};

/** Raised surface: soft shadow in light, tonal lift in dark. No heavy outline. */
export function Card({ style, flush = false, ...rest }: Props) {
  const { palette: theme, spacing, scheme } = useAppearance();
  const dark = scheme === 'dark';
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: flush ? 0 : spacing.md,
          gap: flush ? 0 : spacing.sm,
          overflow: flush ? 'hidden' : undefined,
          borderWidth: dark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: dark ? undefined : cardShadow,
        },
        style,
      ]}
    />
  );
}
