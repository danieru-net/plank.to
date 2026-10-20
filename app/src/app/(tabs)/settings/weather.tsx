import { Screen } from '@/components/Screen';
import { useAppearance } from '@/features/appearance/context';
import { WeatherSettingsCard } from '@/features/weather/WeatherSettingsCard';

export default function WeatherSettingsScreen() {
  const { spacing } = useAppearance();
  return (
    <Screen contentContainerStyle={{ gap: spacing.lg }} keyboardDismissMode="on-drag">
      <WeatherSettingsCard />
    </Screen>
  );
}
