import { Directory, File, Paths } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { isImageInUse } from '@/db/localImage';
import { defaultId } from '@/db/taskRepository';

/**
 * Pictures chosen for tasks and routines. The picker's result lives in a temporary cache that
 * the system may clear, so the chosen photo is copied into the app's own documents folder and
 * that copy's URI is saved. Nothing is uploaded; the photo library itself is never changed.
 */

function picturesDirectory(): Directory {
  return new Directory(Paths.document, 'pictures');
}

/** Whether `uri` is a copy this app made, and so one it may delete. */
export function isAppPicture(uri: string, directoryUri = picturesDirectory().uri): boolean {
  const base = directoryUri.endsWith('/') ? directoryUri : `${directoryUri}/`;
  return uri.startsWith(base) && !uri.slice(base.length).includes('/');
}

/**
 * Opens the system photo picker (no photo library permission is needed for it) with a square
 * crop. Returns the saved copy's URI, or null if the person closed the picker.
 */
export async function pickPicture(): Promise<string | null> {
  const result = await launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const source = new File(asset.uri);
  const extension = source.extension || '.jpg';
  const dir = picturesDirectory();
  dir.create({ idempotent: true, intermediates: true });
  const copy = new File(dir, `${defaultId()}${extension}`);
  await source.copy(copy);
  return copy.uri;
}

export async function pictureExists(uri: string): Promise<boolean> {
  return new File(uri).exists;
}

/**
 * Deletes a picture this app copied once no task or routine uses it any more. Pictures from
 * elsewhere are left alone. Failures are only logged: a leftover file is harmless.
 */
export async function deletePictureIfUnused(
  db: Parameters<typeof isImageInUse>[0],
  uri: string | null,
): Promise<void> {
  if (!uri || !isAppPicture(uri)) return;
  try {
    if (await isImageInUse(db, uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.error(e);
  }
}
