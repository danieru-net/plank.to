import { completionPlan } from './completionMoment';

describe('completionPlan', () => {
  it('does nothing by default', () => {
    expect(completionPlan('none', true)).toEqual({ check: false, sound: false });
    expect(completionPlan('none', false)).toEqual({ check: false, sound: false });
  });

  it('shows the check only when motion is on', () => {
    expect(completionPlan('check', true)).toEqual({ check: true, sound: false });
    expect(completionPlan('check', false)).toEqual({ check: false, sound: false });
  });

  it('plays the sound only when chosen, even with motion off', () => {
    expect(completionPlan('checkSound', true)).toEqual({ check: true, sound: true });
    expect(completionPlan('checkSound', false)).toEqual({ check: false, sound: true });
  });
});
