import * as Location from 'expo-location';

import { getApproximatePosition, requestLocationPermission } from './locationService';

jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const perm = (status: string, granted = status === 'granted') =>
  ({ status, granted }) as Location.LocationPermissionResponse;

beforeEach(() => jest.resetAllMocks());

describe('getApproximatePosition', () => {
  it.each(['denied', 'undetermined'])(
    'returns null without prompting or reading a fix when permission is %s',
    async (status) => {
      mocked.getForegroundPermissionsAsync.mockResolvedValue(perm(status));
      expect(await getApproximatePosition()).toBeNull();
      expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
    },
  );

  it('takes one low-accuracy fix and rounds it to 2 decimals', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(perm('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 59.912731, longitude: 10.746091 },
    } as Location.LocationObject);
    expect(await getApproximatePosition()).toEqual({ latitude: 59.91, longitude: 10.75 });
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 2 });
  });

  it('rejects (for the caller to handle) when the fix fails, and never watches', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(perm('granted'));
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('services off'));
    await expect(getApproximatePosition()).rejects.toThrow('services off');
  });

  it('gives up with null after 10 seconds', async () => {
    jest.useFakeTimers();
    try {
      mocked.getForegroundPermissionsAsync.mockResolvedValue(perm('granted'));
      mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
      const p = getApproximatePosition();
      await jest.advanceTimersByTimeAsync(10_000);
      expect(await p).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('requestLocationPermission', () => {
  it('maps a denial', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(perm('denied'));
    expect(await requestLocationPermission()).toBe('denied');
  });
});
