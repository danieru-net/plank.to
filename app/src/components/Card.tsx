import { View, type ViewProps } from 'react-native';

import { useAppearance } from '@/features/appearance/context';
import { cardShadow, palettes, radius } from '@/theme';

/** Elevated surface: soft shadow in light, tonal lift in dark. No heavy outline. */
export function Card({ style, ...rest }: ViewProps) {
  const { palette: theme, spacing } = useAppearance();
  const dark = theme.surface === palettes.dark.surface;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          padding: spacing.md,
          gap: spacing.sm,
          borderWidth: dark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: dark ? undefined : cardShadow,
        },
        style,
      ]}
    />
  );
}
