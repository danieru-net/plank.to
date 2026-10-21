import support from '../../shared/support.json';

/**
 * Support contact for plank.to.
 *
 * The address lives in shared/support.json so the app's feedback screen and
 * this site always agree. The contact page and the privacy policy both read
 * from this one constant. Set `mailboxLive` to true in shared/support.json once
 * the mailbox exists and is read, so the "not yet working" wording disappears.
 */
export const supportContact = {
  isPlaceholder: !support.mailboxLive,
  value: support.feedbackEmail,
  href: support.mailboxLive ? `mailto:${support.feedbackEmail}` : undefined,
};
