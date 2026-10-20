/**
 * Local image references for tasks and routines. The database stores only a URI string
 * (`image_uri`); the image file itself stays on the device and is never uploaded.
 *
 * Picking images is deferred (see done.md, task 2.7), but references are validated and
 * resolved here so the picker can be added without changing the data model: the picker saves
 * a URI with `updateTask({ imageUri })`, removal is `updateTask({ imageUri: null })`, and the
 * UI calls `resolveImage` before rendering so a moved or deleted file shows a fallback
 * instead of a broken image.
 */

export const MAX_IMAGE_URI_LENGTH = 2048;

/** Schemes that point at the device's own storage or photo library. Remote URLs are rejected. */
const LOCAL_SCHEMES = ['file:', 'content:', 'ph:', 'assets-library:'];

export function isLocalImageUri(uri: string): boolean {
  if (!uri || uri.length > MAX_IMAGE_URI_LENGTH || /\s/.test(uri)) return false;
  const lower = uri.toLowerCase();
  return LOCAL_SCHEMES.some((s) => lower.startsWith(s));
}

export type ImageState =
  /** No image is attached. */
  | { status: 'none' }
  /** The file is present; render `uri`. */
  | { status: 'available'; uri: string }
  /** A reference is saved but the file is gone or unreadable; offer to remove or replace it. */
  | { status: 'missing'; uri: string };

/**
 * Checks whether a saved reference can still be shown. `exists` is injected (for example a
 * wrapper around the file system API) so this stays testable; if it throws, the image is
 * treated as missing.
 */
export async function resolveImage(
  uri: string | null,
  exists: (uri: string) => Promise<boolean>,
): Promise<ImageState> {
  if (!uri) return { status: 'none' };
  try {
    return (await exists(uri)) ? { status: 'available', uri } : { status: 'missing', uri };
  } catch {
    return { status: 'missing', uri };
  }
}
