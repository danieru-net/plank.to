import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { resolveImage, type ImageState } from '@/db/localImage';
import { useAppearance } from '@/features/appearance/context';
import { radius } from '@/theme';
import { pictureExists } from './pictureStorage';
import { findSymbol } from './symbols';

type Props = {
  symbol: string | null;
  imageUri: string | null;
  /** Width and height in points, before the text size setting is applied. */
  size: number;
  /** Fades the picture like the title of a completed or dismissed task. */
  muted?: boolean;
};

/** Checks the saved picture still exists; null while checking. */
export function useImageState(uri: string | null): ImageState | null {
  const [state, setState] = useState<ImageState | null>(uri ? null : { status: 'none' });
  useEffect(() => {
    let cancelled = false;
    resolveImage(uri, pictureExists).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);
  return state;
}

/**
 * A task's picture, or its symbol when there is no picture (or the file has gone). Renders
 * nothing when the task has neither. Hidden from screen readers: the title next to it is the
 * name, and the symbol's label is read with the row instead (see `pictureLabel`).
 */
export function TaskPicture({ symbol, imageUri, size, muted }: Props) {
  const { palette: theme, settings } = useAppearance();
  const image = useImageState(imageUri);
  const found = findSymbol(symbol);
  const side = Math.round(size * settings.textScale);
  const box = {
    width: side,
    height: side,
    opacity: muted ? 0.5 : 1,
    borderRadius: side >= 64 ? radius.lg : radius.sm,
  };

  let content = null;
  if (image?.status === 'available')
    content = <Image source={{ uri: image.uri }} style={[styles.image, box]} />;
  else if (found)
    // The symbol is text, so it also follows the device's text size, like the title next to it.
    content = (
      <Text style={{ fontSize: side * 0.75, lineHeight: side, textAlign: 'center' }}>
        {found.emoji}
      </Text>
    );
  else if (imageUri && image === null)
    // Keeps the row from jumping while the file is checked.
    content = <View style={[box, { backgroundColor: theme.background }]} />;
  if (!content) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, found && image?.status !== 'available' ? { minWidth: side } : box]}
    >
      {content}
    </View>
  );
}

/**
 * The symbol's name, for the row's screen reader label. A photo has no description to read,
 * so a task with a photo gets none.
 */
export function pictureLabel(symbol: string | null, imageUri: string | null): string | null {
  return imageUri ? null : (findSymbol(symbol)?.label ?? null);
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { resizeMode: 'cover' },
});
