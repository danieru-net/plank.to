import { parseFeedbackKind } from './feedbackKind';

describe('parseFeedbackKind', () => {
  it('accepts each known kind', () => {
    expect(parseFeedbackKind('idea')).toBe('idea');
    expect(parseFeedbackKind('improvement')).toBe('improvement');
    expect(parseFeedbackKind('problem')).toBe('problem');
  });

  it('uses the first value when a parameter is repeated', () => {
    expect(parseFeedbackKind(['problem', 'idea'])).toBe('problem');
  });

  it('falls back to an idea for missing or unknown values', () => {
    expect(parseFeedbackKind(undefined)).toBe('idea');
    expect(parseFeedbackKind('')).toBe('idea');
    expect(parseFeedbackKind('bug')).toBe('idea');
  });
});
