/**
 * The phrases to speak for a task: its title first, then its notes. Blank values are skipped,
 * and each phrase ends with a full stop so the voice pauses between them.
 */
export function readAloudPhrases(task: { title: string; notes: string | null }): string[] {
  return [task.title, task.notes ?? '']
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => (/[.!?…]$/.test(text) ? text : `${text}.`));
}
