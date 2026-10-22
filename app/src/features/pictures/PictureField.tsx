import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useDatabase } from '@/db/DatabaseProvider';
import { useAppearance } from '@/features/appearance/context';
import { minTouchTarget, radius, tint } from '@/theme';
import { deletePictureIfUnused, pickPicture } from './pictureStorage';
import { TASK_SYMBOLS } from './symbols';
import { TaskPicture, useImageState } from './TaskPicture';

type Props = {
  /** Symbol id, or '' for none. */
  symbol: string;
  /** Local picture URI, or '' for none. */
  imageUri: string;
  onChangeSymbol: (symbol: string) => void;
  onChangeImage: (uri: string) => void;
  /** Called with each picture the picker saves, so the editor can tidy up unsaved ones. */
  onPicked?: (uri: string) => void;
  error?: string;
};

/**
 * Optional picture and symbol for a task or routine. A photo comes from the system picker and
 * is copied into the app; the symbol is shown when there is no photo, or if the photo goes
 * missing. Both stay on the device.
 */
export function PictureField({
  symbol,
  imageUri,
  onChangeSymbol,
  onChangeImage,
  onPicked,
  error,
}: Props) {
  const { palette: theme, spacing } = useAppearance();
  const image = useImageState(imageUri || null);
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const choose = async () => {
    setBusy(true);
    setPickError(null);
    try {
      const uri = await pickPicture();
      if (uri) {
        onPicked?.(uri);
        onChangeImage(uri);
      }
    } catch (e) {
      console.error(e);
      setPickError('That picture could not be added. Try another one.');
    } finally {
      setBusy(false);
    }
  };

  const shown = !!imageUri || !!symbol;
  const message = error ?? pickError;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodyStrong">Picture (optional)</Text>
      <Card>
        {shown ? (
          <View style={[styles.preview, { gap: spacing.md }]}>
            <TaskPicture symbol={symbol || null} imageUri={imageUri || null} size={72} />
            <Text variant="caption" muted style={styles.grow}>
              {image?.status === 'missing'
                ? 'The photo could not be found on this device. Choose another or remove it.'
                : imageUri
                  ? 'Your photo. It stays on this device.'
                  : 'Shown next to the title on Today.'}
            </Text>
          </View>
        ) : null}
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <Button
            label={busy ? 'Opening photos…' : imageUri ? 'Choose another photo' : 'Choose a photo'}
            icon="image-outline"
            variant="secondary"
            inline
            disabled={busy}
            onPress={choose}
          />
          {imageUri ? (
            <Button
              label="Remove photo"
              variant="plainDanger"
              inline
              onPress={() => onChangeImage('')}
            />
          ) : null}
        </View>
        {message ? (
          <Text variant="caption" accessibilityRole="alert" style={{ color: theme.danger }}>
            Error: {message}
          </Text>
        ) : null}
      </Card>

      <Text variant="caption" muted style={{ paddingHorizontal: spacing.md }}>
        {imageUri ? 'Symbol, shown if the photo is missing' : 'Or choose a symbol'}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Symbol"
        style={[styles.wrap, { gap: spacing.xs }]}
      >
        {[{ id: '', emoji: '', label: 'No symbol' }, ...TASK_SYMBOLS].map((s) => {
          const selected = symbol === s.id;
          return (
            <Pressable
              key={s.id || 'none'}
              accessibilityRole="radio"
              accessibilityLabel={s.label}
              accessibilityState={{ selected }}
              onPress={() => onChangeSymbol(s.id)}
              style={[
                styles.symbol,
                {
                  backgroundColor: selected ? tint(theme.primary, 0.16) : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
            >
              {s.id ? (
                <Text style={styles.emoji}>{s.emoji}</Text>
              ) : (
                <Ionicons name="close" size={22} color={theme.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Tracks the photos picked while an editor is open, so the ones that end up unused are deleted:
 * the previous photo once a replacement is saved, and new photos if the editor is closed
 * without saving. Files still used by another task or routine are kept.
 */
export function usePictureCleanup() {
  const db = useDatabase();
  const candidates = useRef(new Set<string>());
  const saved = useRef(false);

  const track = useCallback((uri: string | null | undefined) => {
    if (uri) candidates.current.add(uri);
  }, []);

  const cleanUp = useCallback(
    async (keep?: string | null) => {
      const uris = [...candidates.current].filter((u) => u !== keep);
      candidates.current.clear();
      for (const uri of uris) await deletePictureIfUnused(db, uri);
    },
    [db],
  );

  /** Call after a save: deletes every tracked photo except the one now saved. */
  const committed = useCallback(
    (keep: string | null) => {
      saved.current = true;
      return cleanUp(keep);
    },
    [cleanUp],
  );

  // Closing without saving: the saved photo is still in use and is kept by the reference check.
  useEffect(
    () => () => {
      if (!saved.current) void cleanUp();
    },
    [cleanUp],
  );

  return { track, committed };
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  symbol: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26, lineHeight: 32 },
});
