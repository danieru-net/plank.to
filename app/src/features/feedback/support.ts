import support from '../../../../shared/support.json';

/** Address that in-app feedback is sent to. Shared with the website; edit shared/support.json. */
export const FEEDBACK_EMAIL: string = support.feedbackEmail;

/** False until the mailbox exists and is read. */
export const FEEDBACK_MAILBOX_LIVE: boolean = support.mailboxLive;
