/** Which optional parts of the app are shown. Simple mode only hides UI; it never changes data. */
export type VisibleFeatures = {
  /** The Routines tab. Routines that already appear on Today are unaffected. */
  routinesTab: boolean;
  /** The weather and clothing card on Today, and the Weather page link in Settings. */
  weather: boolean;
};

export function visibleFeatures(simpleMode: boolean): VisibleFeatures {
  return { routinesTab: !simpleMode, weather: !simpleMode };
}
