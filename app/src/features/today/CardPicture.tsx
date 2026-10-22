import { View } from 'react-native';

import { Text } from '@/components/Text';
import { useAppearance } from '@/features/appearance/context';
import { TaskPicture, useImageState } from '@/features/pictures/TaskPicture';
import { findSymbol } from '@/features/pictures/symbols';
import { radius, tint } from '@/theme';
import { cardPictureKind, titleInitial } from './pictureCard';

type Props = {
  title: string;
  symbol: string | null;
  imageUri: string | null;
  size: number;
  muted?: boolean;
};

/**
 * The large picture area of a picture card. A task with no photo or symbol shows the first
 * letter of its title on a tinted tile, so a card is never text only.
 */
export function CardPicture({ title, symbol, imageUri, size, muted }: Props) {
  const { palette: theme, settings } = useAppearance();
  const image = useImageState(imageUri);
  const kind = cardPictureKind({
    hasSymbol: findSymbol(symbol) !== null,
    imageUri,
    imageStatus: image?.status ?? null,
  });
  if (kind !== 'initial')
    return <TaskPicture symbol={symbol} imageUri={imageUri} size={size} muted={muted} />;
  const side = Math.round(size * settings.textScale);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: side,
        height: side,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tint(theme.primary, 0.12),
        opacity: muted ? 0.5 : 1,
      }}
    >
      <Text
        variant="heading"
        style={{ fontSize: side * 0.5, lineHeight: side * 0.6, color: theme.primary }}
      >
        {titleInitial(title)}
      </Text>
    </View>
  );
}
