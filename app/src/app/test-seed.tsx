import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useDatabase } from '@/db/DatabaseProvider';
import { createPreferenceRepository } from '@/db/preferenceRepository';
import { useAppearanceControls } from '@/features/appearance/AppearanceProvider';
import { parseAppearance } from '@/features/appearance/settings';
import { parseScenario, resetAndSeed } from '@/testing/seed';
import { parseNetworkMode, setStubNetworkMode } from '@/testing/stubFetch';
import { TEST_MODE } from '@/testing/testMode';

/**
 * Test-only deep link: `plank://test-seed?scenario=empty|seeded|seeded-weather[&network=ok|offline|error]` wipes the local
 * database, loads the scenario, then opens Today. Outside test mode (every release build) it
 * redirects straight to Today and touches nothing.
 */
const READY_HOLD_MS = 1500;

export default function TestSeed() {
  if (!TEST_MODE) return <Redirect href="/" />;
  return <TestSeedRunner />;
}

function TestSeedRunner() {
  const db = useDatabase();
  const router = useRouter();
  const { update } = useAppearanceControls();
  const { scenario, network } = useLocalSearchParams<{ scenario?: string; network?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setStubNetworkMode(parseNetworkMode(network));
    resetAndSeed(db, parseScenario(scenario))
      // The appearance provider loaded its settings at startup; hand it the seeded ones.
      .then(() => createPreferenceRepository(db).getAll())
      .then((stored) => update(parseAppearance(stored)))
      .then(
        () => {
          if (cancelled) return;
          // Hold the marker long enough for UI flows to see it before Today replaces it.
          setReady(true);
          timer = setTimeout(() => router.replace('/'), READY_HOLD_MS);
        },
        (e: unknown) => {
          console.error(e);
          if (!cancelled) setError(String(e));
        },
      );
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [db, router, scenario, network, update]);

  return (
    <Screen>
      <Text>
        {error
          ? `Error: test seed failed: ${error}`
          : ready
            ? 'Test data ready'
            : 'Preparing test data'}
      </Text>
    </Screen>
  );
}
