import { FEEDBACK_EMAIL, FEEDBACK_MAILBOX_LIVE } from './support';

describe('feedback support config', () => {
  it('reads a plain email address from the shared config', () => {
    expect(FEEDBACK_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('exposes whether the mailbox is live as a boolean', () => {
    expect(typeof FEEDBACK_MAILBOX_LIVE).toBe('boolean');
  });
});
