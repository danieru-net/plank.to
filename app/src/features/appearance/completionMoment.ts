import type { CompletionMoment } from './settings';

export type CompletionPlan = { check: boolean; sound: boolean };

/**
 * What to show and play when a task is completed. The check is an animation, so it needs
 * motion; the sound does not. The default ("none") shows and plays nothing.
 */
export function completionPlan(moment: CompletionMoment, motion: boolean): CompletionPlan {
  return {
    check: moment !== 'none' && motion,
    sound: moment === 'checkSound',
  };
}
