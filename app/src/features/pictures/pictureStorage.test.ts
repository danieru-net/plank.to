import { isAppPicture } from './pictureStorage';

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///docs/' },
  Directory: jest.fn(),
  File: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

describe('isAppPicture', () => {
  const dir = 'file:///docs/pictures/';

  it('accepts files directly inside the pictures folder', () => {
    expect(isAppPicture('file:///docs/pictures/abc.jpg', dir)).toBe(true);
    expect(isAppPicture('file:///docs/pictures/abc.jpg', 'file:///docs/pictures')).toBe(true);
  });

  it('rejects pictures elsewhere, so they are never deleted', () => {
    expect(isAppPicture('file:///docs/other/abc.jpg', dir)).toBe(false);
    expect(isAppPicture('file:///docs/pictures-old/abc.jpg', dir)).toBe(false);
    expect(isAppPicture('file:///docs/pictures/nested/abc.jpg', dir)).toBe(false);
    expect(isAppPicture('ph://ABC-123', dir)).toBe(false);
  });
});
