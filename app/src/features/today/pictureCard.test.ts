import { cardControls, cardPictureKind, titleInitial } from './pictureCard';

describe('cardPictureKind', () => {
  it('prefers an available photo, then a symbol, then the initial', () => {
    expect(
      cardPictureKind({ hasSymbol: true, imageUri: 'file:///a', imageStatus: 'available' }),
    ).toBe('image');
    expect(cardPictureKind({ hasSymbol: true, imageUri: null, imageStatus: 'none' })).toBe(
      'symbol',
    );
    expect(cardPictureKind({ hasSymbol: false, imageUri: null, imageStatus: 'none' })).toBe(
      'initial',
    );
  });

  it('falls back when the photo is missing or still being checked', () => {
    expect(
      cardPictureKind({ hasSymbol: true, imageUri: 'file:///a', imageStatus: 'missing' }),
    ).toBe('symbol');
    expect(
      cardPictureKind({ hasSymbol: false, imageUri: 'file:///a', imageStatus: 'missing' }),
    ).toBe('initial');
    expect(cardPictureKind({ hasSymbol: false, imageUri: 'file:///a', imageStatus: null })).toBe(
      'initial',
    );
  });
});

describe('titleInitial', () => {
  it('upper-cases the first character', () => {
    expect(titleInitial('  brush teeth')).toBe('B');
    expect(titleInitial('école')).toBe('É');
  });

  it('keeps an emoji whole and handles blank titles', () => {
    expect(titleInitial('🎒 pack bag')).toBe('🎒');
    expect(titleInitial('   ')).toBe('?');
  });
});

describe('cardControls', () => {
  it('follows Task actions and Read aloud in the standard layout', () => {
    expect(cardControls({ pictureCards: false, taskActions: 'compact', readAloud: false })).toEqual(
      {
        labelledButtons: false,
        compactControls: true,
        readAloudButton: false,
        pictureReadsAloud: false,
      },
    );
    expect(cardControls({ pictureCards: false, taskActions: 'buttons', readAloud: true })).toEqual({
      labelledButtons: true,
      compactControls: false,
      readAloudButton: true,
      pictureReadsAloud: false,
    });
  });

  it('always uses labelled buttons and tap-to-read in picture cards', () => {
    for (const taskActions of ['compact', 'buttons'] as const)
      for (const readAloud of [true, false])
        expect(cardControls({ pictureCards: true, taskActions, readAloud })).toEqual({
          labelledButtons: true,
          compactControls: false,
          readAloudButton: false,
          pictureReadsAloud: true,
        });
  });
});
