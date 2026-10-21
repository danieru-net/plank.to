import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';

import { mailtoUrl, sendFeedback } from './sendFeedback';

jest.mock('expo-mail-composer', () => ({
  MailComposerStatus: {
    UNDETERMINED: 'undetermined',
    SENT: 'sent',
    SAVED: 'saved',
    CANCELLED: 'cancelled',
  },
  isAvailableAsync: jest.fn(),
  composeAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

const composer = MailComposer as jest.Mocked<typeof MailComposer>;
const linking = Linking as jest.Mocked<typeof Linking>;

const to = 'feedback@example.com';
const message = { subject: 'Plank idea: Dark & light', body: 'Line one\nLine two?' };

beforeEach(() => jest.resetAllMocks());

describe('mailtoUrl', () => {
  it('encodes the subject and body', () => {
    expect(mailtoUrl(to, message)).toBe(
      'mailto:feedback@example.com?subject=Plank%20idea%3A%20Dark%20%26%20light&body=Line%20one%0ALine%20two%3F',
    );
  });
});

describe('sendFeedback', () => {
  it('fills in the mail composer and does not open mailto', async () => {
    composer.isAvailableAsync.mockResolvedValue(true);
    composer.composeAsync.mockResolvedValue({ status: MailComposer.MailComposerStatus.SENT });

    expect(await sendFeedback(to, message)).toBe('sent');
    expect(composer.composeAsync).toHaveBeenCalledWith({
      recipients: [to],
      subject: message.subject,
      body: message.body,
    });
    expect(linking.openURL).not.toHaveBeenCalled();
  });

  it.each([
    [MailComposer.MailComposerStatus.SAVED, 'saved'],
    [MailComposer.MailComposerStatus.CANCELLED, 'cancelled'],
    [MailComposer.MailComposerStatus.UNDETERMINED, 'handedOff'],
  ])('reports composer status %s as %s', async (status, outcome) => {
    composer.isAvailableAsync.mockResolvedValue(true);
    composer.composeAsync.mockResolvedValue({ status });
    expect(await sendFeedback(to, message)).toBe(outcome);
  });

  it('falls back to mailto when no mail account is set up', async () => {
    composer.isAvailableAsync.mockResolvedValue(false);
    linking.openURL.mockResolvedValue(true);

    expect(await sendFeedback(to, message)).toBe('handedOff');
    expect(composer.composeAsync).not.toHaveBeenCalled();
    expect(linking.openURL).toHaveBeenCalledWith(mailtoUrl(to, message));
  });

  it('falls back to mailto when the composer fails to open', async () => {
    composer.isAvailableAsync.mockResolvedValue(true);
    composer.composeAsync.mockRejectedValue(new Error('busy'));
    linking.openURL.mockResolvedValue(true);

    expect(await sendFeedback(to, message)).toBe('handedOff');
  });

  it('falls back to mailto when checking the composer throws', async () => {
    composer.isAvailableAsync.mockRejectedValue(new Error('no module'));
    linking.openURL.mockResolvedValue(true);

    expect(await sendFeedback(to, message)).toBe('handedOff');
  });

  it('reports unavailable when mailto cannot be opened either', async () => {
    composer.isAvailableAsync.mockResolvedValue(false);
    linking.openURL.mockRejectedValue(new Error('no handler'));

    expect(await sendFeedback(to, message)).toBe('unavailable');
  });
});
