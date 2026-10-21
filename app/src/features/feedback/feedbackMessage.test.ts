import type { DiagnosticLine } from './diagnostics';
import { buildFeedbackMessage, type FeedbackForm } from './feedbackMessage';

const details: DiagnosticLine[] = [
  { label: 'App version', value: '1.0.0 (7)' },
  { label: 'System', value: 'iOS 27.0' },
  { label: 'Device', value: 'iPhone 17' },
  { label: 'Text size', value: 'Larger' },
  { label: 'Colors', value: 'Sage (green accent)' },
];

const detailsBlock = [
  'Device details:',
  'App version: 1.0.0 (7)',
  'System: iOS 27.0',
  'Device: iPhone 17',
  'Text size: Larger',
  'Colors: Sage (green accent)',
].join('\n');

const form = (overrides: Partial<FeedbackForm>): FeedbackForm => ({
  kind: 'idea',
  message: '',
  context: '',
  includeDetails: true,
  ...overrides,
});

describe('buildFeedbackMessage', () => {
  it('builds an idea with device details', () => {
    expect(
      buildFeedbackMessage(form({ kind: 'idea', message: 'A dark mode for widgets' }), details),
    ).toEqual({
      subject: 'Plank idea: A dark mode for widgets',
      body: `A dark mode for widgets\n\n${detailsBlock}`,
    });
  });

  it('builds an improvement without device details', () => {
    expect(
      buildFeedbackMessage(
        form({ kind: 'improvement', message: 'Bigger buttons on Today', includeDetails: false }),
        details,
      ),
    ).toEqual({
      subject: 'Plank improvement: Bigger buttons on Today',
      body: 'Bigger buttons on Today',
    });
  });

  it('adds what the user was trying to do to a problem', () => {
    const { subject, body } = buildFeedbackMessage(
      form({
        kind: 'problem',
        message: 'The routine vanished',
        context: 'Adding a school routine',
      }),
      details,
    );
    expect(subject).toBe('Plank problem: The routine vanished');
    expect(body).toBe(
      `The routine vanished\n\nWhat I was trying to do:\nAdding a school routine\n\n${detailsBlock}`,
    );
  });

  it('leaves out the context section when it is empty', () => {
    const { body } = buildFeedbackMessage(
      form({ kind: 'problem', message: 'It crashed', context: '   ', includeDetails: false }),
      details,
    );
    expect(body).toBe('It crashed');
  });

  it('ignores context left over from a problem when the type is changed', () => {
    const { body } = buildFeedbackMessage(
      form({ kind: 'idea', message: 'Stickers', context: 'Old text', includeDetails: false }),
      details,
    );
    expect(body).toBe('Stickers');
  });

  it('never includes device details when the toggle is off', () => {
    for (const kind of ['idea', 'improvement', 'problem'] as const) {
      const { body } = buildFeedbackMessage(
        form({ kind, message: 'Hello', context: 'Something', includeDetails: false }),
        details,
      );
      expect(body).not.toContain('Device details');
      for (const d of details) expect(body).not.toContain(d.value);
    }
  });

  it('uses the type alone as the subject when the message is empty', () => {
    expect(buildFeedbackMessage(form({ kind: 'problem', message: '  ' }), details)).toEqual({
      subject: 'Plank problem',
      body: detailsBlock,
    });
  });

  it('uses only the first line of the message in the subject and shortens long ones', () => {
    const long = 'Please add a way to share a routine with someone who helps me plan the week';
    const { subject, body } = buildFeedbackMessage(
      form({ message: `  ${long}\nMore detail here`, includeDetails: false }),
      details,
    );
    expect(subject).toBe('Plank idea: Please add a way to share a routine with someone who helps…');
    expect(subject.length).toBeLessThanOrEqual('Plank idea: '.length + 60);
    expect(body).toBe(`${long}\nMore detail here`);
  });
});
