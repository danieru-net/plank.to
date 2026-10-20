import { Redirect, useLocalSearchParams } from 'expo-router';

import { parseNetworkMode, setStubNetworkMode } from '@/testing/stubFetch';
import { TEST_MODE } from '@/testing/testMode';

/**
 * Test-only deep link: `plank://test-network?mode=ok|offline|error` changes how the stubbed
 * weather network behaves, then opens Today. Outside test mode it only redirects to Today.
 */
export default function TestNetwork() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (TEST_MODE) setStubNetworkMode(parseNetworkMode(mode));
  return <Redirect href="/" />;
}
