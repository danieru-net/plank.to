/** What a feedback message is about. Settings opens the feedback screen with one of these. */
export type FeedbackKind = 'idea' | 'improvement' | 'problem';

export const feedbackKinds: readonly FeedbackKind[] = ['idea', 'improvement', 'problem'];

/** Reads the `kind` route parameter, falling back to an idea for missing or unknown values. */
export function parseFeedbackKind(value: string | string[] | undefined): FeedbackKind {
  const raw = Array.isArray(value) ? value[0] : value;
  return feedbackKinds.find((k) => k === raw) ?? 'idea';
}
