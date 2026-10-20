import { isLocalImageUri, MAX_IMAGE_URI_LENGTH, resolveImage } from './localImage';

describe('isLocalImageUri', () => {
  it('accepts device-local references', () => {
    expect(isLocalImageUri('file:///var/mobile/photo.jpg')).toBe(true);
    expect(isLocalImageUri('content://media/external/images/1')).toBe(true);
    expect(isLocalImageUri('ph://ABC-123/L0/001')).toBe(true);
    expect(isLocalImageUri('FILE:///a.png')).toBe(true);
  });

  it('rejects remote, inline, malformed, or oversized references', () => {
    expect(isLocalImageUri('https://example.com/a.png')).toBe(false);
    expect(isLocalImageUri('data:image/png;base64,AAAA')).toBe(false);
    expect(isLocalImageUri('/just/a/path.png')).toBe(false);
    expect(isLocalImageUri('file:///has space.png')).toBe(false);
    expect(isLocalImageUri('')).toBe(false);
    expect(isLocalImageUri('file:///' + 'a'.repeat(MAX_IMAGE_URI_LENGTH))).toBe(false);
  });
});

describe('resolveImage', () => {
  it('reports no image without checking the file system', async () => {
    const exists = jest.fn();
    expect(await resolveImage(null, exists)).toEqual({ status: 'none' });
    expect(exists).not.toHaveBeenCalled();
  });

  it('reports available and missing files', async () => {
    expect(await resolveImage('file:///a.png', async () => true)).toEqual({
      status: 'available',
      uri: 'file:///a.png',
    });
    expect(await resolveImage('file:///a.png', async () => false)).toEqual({
      status: 'missing',
      uri: 'file:///a.png',
    });
  });

  it('treats a failing check as missing', async () => {
    const exists = async () => {
      throw new Error('denied');
    };
    expect(await resolveImage('file:///a.png', exists)).toEqual({
      status: 'missing',
      uri: 'file:///a.png',
    });
  });
});
