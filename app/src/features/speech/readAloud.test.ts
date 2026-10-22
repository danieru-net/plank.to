import { readAloudPhrases } from './readAloud';

describe('readAloudPhrases', () => {
  it('speaks the title, then the notes', () => {
    expect(
      readAloudPhrases({ title: 'Brush teeth', notes: 'Two minutes, top and bottom' }),
    ).toEqual(['Brush teeth.', 'Two minutes, top and bottom.']);
  });

  it('skips missing or blank notes', () => {
    expect(readAloudPhrases({ title: 'Shower', notes: null })).toEqual(['Shower.']);
    expect(readAloudPhrases({ title: 'Shower', notes: '   ' })).toEqual(['Shower.']);
  });

  it('keeps existing end punctuation and trims whitespace', () => {
    expect(readAloudPhrases({ title: ' Ready to go? ', notes: 'Bag, shoes!' })).toEqual([
      'Ready to go?',
      'Bag, shoes!',
    ]);
  });
});
