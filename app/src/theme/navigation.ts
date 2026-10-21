import { useAppearance } from '@/features/appearance/context';

/** Header options shared by every stack, so the chrome follows the chosen colors and text size. */
export function useStackScreenOptions({ largeTitle = false } = {}) {
  const { palette: theme } = useAppearance();
  return {
    headerLargeTitleEnabled: largeTitle,
    headerLargeTitleShadowVisible: false,
    // An opaque header background hides the large title on iOS, so large-title stacks leave it
    // transparent; the screen background shows through. Android has no large title and would
    // fall back to the navigation default (white), so it always gets the theme background.
    headerStyle:
      largeTitle && process.env.EXPO_OS === 'ios'
        ? undefined
        : { backgroundColor: theme.background },
    headerLargeTitleStyle: { color: theme.text },
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '600' as const, color: theme.text },
    headerTintColor: theme.primary,
    contentStyle: { backgroundColor: theme.background },
  };
}
