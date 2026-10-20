import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';

import { useAppearance } from './context';

/**
 * Haptic feedback that respects the "Haptic feedback" setting. iOS only: Android vibration is
 * left to the system so it never surprises people who turned vibration down.
 */
export function useFeedback() {
  const { settings } = useAppearance();
  const on = settings.haptics && process.env.EXPO_OS === 'ios';
  return useMemo(
    () => ({
      tap: () => {
        if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      success: () => {
        if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    }),
    [on],
  );
}
