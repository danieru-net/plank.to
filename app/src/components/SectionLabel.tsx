import { Text } from './Text';

/** Small uppercase group label above a list section. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      variant="caption"
      muted
      accessibilityRole="header"
      style={{ fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', paddingTop: 8 }}
    >
      {children}
    </Text>
  );
}
