import { feedbackKinds } from './feedbackKind';
import type { FeedbackForm } from './feedbackMessage';

/** Whether there is anything worth keeping. The type and toggle alone are not a draft. */
export function hasDraftText(form: Pick<FeedbackForm, 'message' | 'context'>): boolean {
  return form.message.trim().length > 0 || form.context.trim().length > 0;
}

/** Validates the stored draft; anything malformed or empty is treated as no draft. */
export function parseFeedbackDraft(raw: unknown): FeedbackForm | null {
  const d = raw as Partial<FeedbackForm> | null;
  if (
    !d ||
    typeof d !== 'object' ||
    !feedbackKinds.includes(d.kind as FeedbackForm['kind']) ||
    typeof d.message !== 'string' ||
    typeof d.context !== 'string' ||
    typeof d.includeDetails !== 'boolean'
  ) {
    return null;
  }
  const draft: FeedbackForm = {
    kind: d.kind as FeedbackForm['kind'],
    message: d.message,
    context: d.context,
    includeDetails: d.includeDetails,
  };
  return hasDraftText(draft) ? draft : null;
}
