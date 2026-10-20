import { useAppearance } from '@/features/appearance/context';
import { Text } from './Text';

/** Small uppercase group label above a list section, lined up with the row text below it. */
export function SectionLabel({ children }: { children: string }) {
  const { spacing } = useAppearance();
  return (
    <Text
      variant="caption"
      muted
      accessibilityRole="header"
      style={{
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        paddingHorizontal: spacing.md,
      }}
    >
      {children}
    </Text>
  );
}
