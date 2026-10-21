import type { DiagnosticLine } from './diagnostics';
import type { FeedbackKind } from './feedbackKind';

/** What the user filled in on the feedback screen. */
export type FeedbackForm = {
  kind: FeedbackKind;
  message: string;
  /** "What were you trying to do?" Only used for problems. */
  context: string;
  includeDetails: boolean;
};

export type FeedbackMessage = { subject: string; body: string };

const subjectPrefixes: Record<FeedbackKind, string> = {
  idea: 'Plank idea',
  improvement: 'Plank improvement',
  problem: 'Plank problem',
};

const maxSummaryLength = 60;

/**
 * Builds the email subject and body. Device details are added only when `includeDetails` is on,
 * and nothing else about the user's planner, location or clothing is ever included.
 */
export function buildFeedbackMessage(
  form: FeedbackForm,
  details: readonly DiagnosticLine[],
): FeedbackMessage {
  const message = form.message.trim();
  const context = form.kind === 'problem' ? form.context.trim() : '';

  const sections: string[] = [message];
  if (context) sections.push(`What I was trying to do:\n${context}`);
  if (form.includeDetails && details.length > 0) {
    sections.push(`Device details:\n${details.map((d) => `${d.label}: ${d.value}`).join('\n')}`);
  }

  const summary = summarize(message);
  const prefix = subjectPrefixes[form.kind];
  return {
    subject: summary ? `${prefix}: ${summary}` : prefix,
    body: sections.filter(Boolean).join('\n\n'),
  };
}

/** The first line of the message, shortened so the subject stays readable in an inbox. */
function summarize(message: string): string {
  const firstLine = message.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (firstLine.length <= maxSummaryLength) return firstLine;
  return `${firstLine.slice(0, maxSummaryLength - 1).trimEnd()}…`;
}
