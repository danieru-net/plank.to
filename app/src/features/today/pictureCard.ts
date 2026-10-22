/** What a picture card shows in its picture area, so no card is ever a text-only row. */
export type CardPictureKind = 'image' | 'symbol' | 'initial';

/**
 * Picks the visual for a picture card: the task's photo if it is available, else its symbol,
 * else the first letter of the title. `imageStatus` is null while the photo file is checked.
 */
export function cardPictureKind(input: {
  hasSymbol: boolean;
  imageUri: string | null;
  imageStatus: 'available' | 'missing' | 'none' | null;
}): CardPictureKind {
  if (input.imageUri && input.imageStatus === 'available') return 'image';
  if (input.hasSymbol) return 'symbol';
  return 'initial';
}

/** The first letter of a title, upper case, for tasks with no picture. "?" if the title is blank. */
export function titleInitial(title: string): string {
  const first = Array.from(title.trim())[0];
  return first ? first.toLocaleUpperCase() : '?';
}

export type CardControls = {
  /** Labelled Complete and Dismiss buttons. Always on in picture cards, whatever Task actions says. */
  labelledButtons: boolean;
  /** The small check circle and "more" menu of the compact layout. */
  compactControls: boolean;
  /** The separate Read aloud button. Tapping the picture already reads aloud in picture cards. */
  readAloudButton: boolean;
  /** Whether the picture is tappable to read the task aloud. */
  pictureReadsAloud: boolean;
};

/** Which controls a task shows for a given combination of settings. */
export function cardControls(settings: {
  pictureCards: boolean;
  taskActions: 'compact' | 'buttons';
  readAloud: boolean;
}): CardControls {
  if (settings.pictureCards)
    return {
      labelledButtons: true,
      compactControls: false,
      readAloudButton: false,
      pictureReadsAloud: true,
    };
  return {
    labelledButtons: settings.taskActions === 'buttons',
    compactControls: settings.taskActions === 'compact',
    readAloudButton: settings.readAloud,
    pictureReadsAloud: false,
  };
}
