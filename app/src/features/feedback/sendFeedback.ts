import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';

import type { FeedbackMessage } from './feedbackMessage';

/**
 * What happened when we tried to hand the message to a mail app.
 * - sent / saved / cancelled: the mail composer reported back.
 * - handedOff: a mail app was opened through `mailto:`, which can't tell us whether it was sent.
 * - unavailable: no mail app could be opened, so the screen shows the address to copy instead.
 */
export type SendOutcome = 'sent' | 'saved' | 'cancelled' | 'handedOff' | 'unavailable';

/** Builds a `mailto:` link with the subject and body encoded. */
export function mailtoUrl(to: string, message: FeedbackMessage): string {
  const query = `subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
  return `mailto:${to}?${query}`;
}

/**
 * Opens the device's mail composer with the message filled in. When no mail account is set up,
 * falls back to a `mailto:` link, and reports `unavailable` if that can't be opened either.
 * Nothing is sent unless the user presses Send in their own mail app.
 */
export async function sendFeedback(to: string, message: FeedbackMessage): Promise<SendOutcome> {
  if (await composerAvailable()) {
    try {
      const { status } = await MailComposer.composeAsync({
        recipients: [to],
        subject: message.subject,
        body: message.body,
      });
      if (status === MailComposer.MailComposerStatus.SENT) return 'sent';
      if (status === MailComposer.MailComposerStatus.SAVED) return 'saved';
      if (status === MailComposer.MailComposerStatus.CANCELLED) return 'cancelled';
      // Android only reports "undetermined": the user left the mail app without telling us.
      return 'handedOff';
    } catch {
      // Fall through to mailto:.
    }
  }

  try {
    await Linking.openURL(mailtoUrl(to, message));
    return 'handedOff';
  } catch {
    return 'unavailable';
  }
}

async function composerAvailable(): Promise<boolean> {
  try {
    return await MailComposer.isAvailableAsync();
  } catch {
    return false;
  }
}
