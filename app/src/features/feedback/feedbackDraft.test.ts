import { hasDraftText, parseFeedbackDraft } from './feedbackDraft';

const draft = {
  kind: 'problem',
  message: 'It froze',
  context: 'Adding a task',
  includeDetails: false,
};

describe('parseFeedbackDraft', () => {
  it('restores a saved draft', () => {
    expect(parseFeedbackDraft(draft)).toEqual(draft);
  });

  it('drops unknown fields', () => {
    expect(parseFeedbackDraft({ ...draft, extra: 1 })).toEqual(draft);
  });

  it('keeps a draft with only the context filled in', () => {
    expect(parseFeedbackDraft({ ...draft, message: '' })).toEqual({ ...draft, message: '' });
  });

  it('treats an empty draft as no draft', () => {
    expect(parseFeedbackDraft({ ...draft, message: '  ', context: '' })).toBeNull();
  });

  it.each([
    null,
    undefined,
    'text',
    [],
    { ...draft, kind: 'question' },
    { ...draft, message: 3 },
    { ...draft, context: null },
    { ...draft, includeDetails: 'yes' },
  ])('treats %p as no draft', (raw) => {
    expect(parseFeedbackDraft(raw)).toBeNull();
  });
});

describe('hasDraftText', () => {
  it('ignores whitespace', () => {
    expect(hasDraftText({ message: ' \n', context: '\t' })).toBe(false);
    expect(hasDraftText({ message: 'Hi', context: '' })).toBe(true);
    expect(hasDraftText({ message: '', context: 'Hi' })).toBe(true);
  });
});
