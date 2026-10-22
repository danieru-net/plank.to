import {
  HOLD_MS,
  UNLOCK_MS,
  generateQuestion,
  isCorrect,
  isUnlocked,
  lockStatus,
  parseCaregiverLock,
  unlockUntil,
} from './caregiverLock';

function seeded(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('generateQuestion', () => {
  it('uses the injected random function', () => {
    const q = generateQuestion(seeded([0, 0.999, 0.5, 0.1, 0.9, 0.3]));
    expect(q.a).toBe(6);
    expect(q.b).toBe(12);
    expect(q.answer).toBe(72);
    expect(q.prompt).toBe('What is 6 × 12?');
  });

  it('gives four different positive choices that include the answer', () => {
    for (let seed = 0; seed < 200; seed++) {
      let s = seed + 1;
      const random = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
      const q = generateQuestion(random);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(q.answer);
      expect(q.choices.every((c) => c > 0)).toBe(true);
      expect(q.answer).toBe(q.a * q.b);
    }
  });

  it('works with the real random function', () => {
    expect(generateQuestion().choices).toHaveLength(4);
  });

  it('handles random returning exactly 1', () => {
    expect(generateQuestion(() => 1).choices).toHaveLength(4);
  });
});

describe('isCorrect', () => {
  const q = generateQuestion(() => 0);
  it('accepts only the answer', () => {
    expect(isCorrect(q, q.answer)).toBe(true);
    expect(isCorrect(q, q.answer + 1)).toBe(false);
    expect(isCorrect(q, NaN)).toBe(false);
  });
});

describe('unlock expiry', () => {
  it('is locked until unlocked', () => {
    expect(isUnlocked(null, 1000)).toBe(false);
  });
  it('stays open until the end time', () => {
    const until = unlockUntil(1000);
    expect(until).toBe(1000 + UNLOCK_MS);
    expect(isUnlocked(until, until - 1)).toBe(true);
    expect(isUnlocked(until, until)).toBe(false);
  });
  it('holds the button for three seconds and unlocks for five minutes', () => {
    expect(HOLD_MS).toBe(3000);
    expect(UNLOCK_MS).toBe(300000);
  });
});

describe('lockStatus', () => {
  it('waits for the setting to load', () => {
    expect(lockStatus(false, false, null, 0)).toBe('loading');
  });
  it('is open when the lock is off', () => {
    expect(lockStatus(true, false, null, 0)).toBe('open');
  });
  it('is locked when on and not unlocked', () => {
    expect(lockStatus(true, true, null, 0)).toBe('locked');
    expect(lockStatus(true, true, 500, 500)).toBe('locked');
  });
  it('is open while unlocked', () => {
    expect(lockStatus(true, true, 500, 499)).toBe('open');
  });
});

describe('parseCaregiverLock', () => {
  it('is off by default and for invalid values', () => {
    expect(parseCaregiverLock({})).toBe(false);
    expect(parseCaregiverLock({ 'caregiver.lockEnabled': 'yes' })).toBe(false);
    expect(parseCaregiverLock({ 'caregiver.lockEnabled': 1 })).toBe(false);
  });
  it('reads true', () => {
    expect(parseCaregiverLock({ 'caregiver.lockEnabled': true })).toBe(true);
  });
});
