import { Ionicons } from '@expo/vector-icons';
import { NativeTabs } from 'expo-router/native-tabs';

import { useAppearance } from '@/features/appearance/context';
import { tint } from '@/theme';

/**
 * The platform's own tab bar: Liquid Glass on recent iOS, Material navigation bar on Android.
 * SF Symbols on iOS; Ionicons stand in on Android so no extra symbol package is needed.
 */
export default function TabsLayout() {
  const { palette: theme } = useAppearance();
  return (
    <NativeTabs
      tintColor={theme.primary}
      iconColor={{ default: theme.textMuted, selected: theme.primary }}
      labelStyle={{ default: { color: theme.textMuted }, selected: { color: theme.primary } }}
      backgroundColor={process.env.EXPO_OS === 'android' ? theme.surface : undefined}
      indicatorColor={tint(theme.primary, 0.16)}
    >
      <NativeTabs.Trigger name="(today)" accessibilityLabel="Today" testID="tab-today">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sun.max', selected: 'sun.max.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="today" />}
        />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="routines" accessibilityLabel="Routines" testID="tab-routines">
        <NativeTabs.Trigger.Icon
          sf="arrow.triangle.2.circlepath"
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="repeat" />}
        />
        <NativeTabs.Trigger.Label>Routines</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="settings"
        accessibilityLabel="Settings and profile"
        testID="tab-settings"
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="settings" />}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
