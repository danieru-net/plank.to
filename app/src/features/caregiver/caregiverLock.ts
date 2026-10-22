/**
 * Pure logic for the optional caregiver lock: a gate for grown-ups with no PIN to remember.
 * The gate is a short hold followed by a multiplication question. It is not security, only a
 * speed bump so a child does not change the schedule by accident.
 */

/** How long the button must be held, in milliseconds. */
export const HOLD_MS = 3000;
/** How long Settings and editing stay open after a correct answer. */
export const UNLOCK_MS = 5 * 60 * 1000;

export type Random = () => number;

export type Question = {
  a: number;
  b: number;
  /** The question as text, for example "What is 7 × 8?". */
  prompt: string;
  answer: number;
  /** Four different numbers including the answer, in the order to show them. */
  choices: number[];
};

function int(random: Random, min: number, max: number): number {
  return min + Math.min(max - min, Math.floor(random() * (max - min + 1)));
}

function shuffle<T>(items: T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(random, 0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Makes a question like "What is 7 × 8?" with four answers to choose from. */
export function generateQuestion(random: Random = Math.random): Question {
  const a = int(random, 6, 9);
  const b = int(random, 6, 12);
  const answer = a * b;
  // Plausible wrong answers: off by one factor, or off by ten. Never negative or repeated.
  const near = [
    answer + a,
    answer - a,
    answer + b,
    answer - b,
    answer + 10,
    answer - 10,
    answer + 1,
  ];
  const wrong = shuffle(
    [...new Set(near)].filter((n) => n > 0 && n !== answer),
    random,
  ).slice(0, 3);
  return {
    a,
    b,
    prompt: `What is ${a} × ${b}?`,
    answer,
    choices: shuffle([answer, ...wrong], random),
  };
}

export function isCorrect(question: Question, given: number): boolean {
  return Number.isFinite(given) && given === question.answer;
}

/** Whether an unlock that ends at `unlockedUntil` (epoch ms, or null if locked) is still open. */
export function isUnlocked(unlockedUntil: number | null, now: number): boolean {
  return unlockedUntil !== null && now < unlockedUntil;
}

/** When an unlock that happens at `now` ends. */
export function unlockUntil(now: number, durationMs: number = UNLOCK_MS): number {
  return now + durationMs;
}

export type LockStatus = 'loading' | 'locked' | 'open';

/** What the app should do right now: wait for the setting, show the gate, or show the content. */
export function lockStatus(
  loaded: boolean,
  enabled: boolean,
  unlockedUntil: number | null,
  now: number,
): LockStatus {
  if (!loaded) return 'loading';
  if (!enabled) return 'open';
  return isUnlocked(unlockedUntil, now) ? 'open' : 'locked';
}

/** Reads the stored setting. Anything but `true` means off. */
export function parseCaregiverLock(stored: Record<string, unknown>): boolean {
  return stored['caregiver.lockEnabled'] === true;
}
