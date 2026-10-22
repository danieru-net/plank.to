import { visibleFeatures } from './simpleMode';

describe('visibleFeatures', () => {
  it('shows everything by default', () => {
    expect(visibleFeatures(false)).toEqual({ routinesTab: true, weather: true });
  });

  it('hides the Routines tab and weather in Simple mode', () => {
    expect(visibleFeatures(true)).toEqual({ routinesTab: false, weather: false });
  });
});
