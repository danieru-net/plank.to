/**
 * Test mode (task 6.5) is for automated simulator runs only. It needs BOTH a development bundle
 * (`__DEV__`) and `EXPO_PUBLIC_PLANK_TEST_MODE=1` when Metro starts. Release bundles have
 * `__DEV__` false, so the check is constant-folded to false and every test hook is inert.
 */
export const TEST_MODE: boolean = __DEV__ && process.env.EXPO_PUBLIC_PLANK_TEST_MODE === '1';
