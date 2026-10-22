import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';

import { readableFontFamily } from '@/theme/tokens';

/** Font files for the readable typeface. They are bundled with the app, so nothing is downloaded. */
export const readableFontFiles = {
  [readableFontFamily.regular]: AtkinsonHyperlegible_400Regular,
  [readableFontFamily.bold]: AtkinsonHyperlegible_700Bold,
};
