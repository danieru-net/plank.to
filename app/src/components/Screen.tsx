import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { useAppearance } from '@/features/appearance/context';

export function Screen({ contentContainerStyle, ...rest }: ScrollViewProps) {
  const { palette: theme, spacing } = useAppearance();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { padding: spacing.md, gap: spacing.md },
        contentContainerStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
