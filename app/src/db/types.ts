/** Row types mirroring src/db/schema.ts. Booleans are stored as 0/1. */

export type Id = string;
/** UTC epoch milliseconds. */
export type Timestamp = number;
/** Local calendar date, `YYYY-MM-DD`. */
export type LocalDate = string;
/** Local wall-clock time, `HH:MM` (24-hour). */
export type LocalTime = string;

export type Bool = 0 | 1;
export type CompletionStatus = 'pending' | 'completed' | 'dismissed';

type Timestamps = { created_at: Timestamp; updated_at: Timestamp };

type ReminderColumns = { reminder_enabled: Bool; reminder_advance_minutes: number };

export type TaskRow = Timestamps &
  ReminderColumns & {
    id: Id;
    title: string;
    notes: string | null;
    date: LocalDate;
    time: LocalTime | null;
    symbol: string | null;
    image_uri: string | null;
    status: CompletionStatus;
    status_changed_at: Timestamp | null;
    /** Set when the task was generated from a routine. */
    routine_id: Id | null;
    routine_occurrence_date: LocalDate | null;
    /** Order among the day's untimed tasks, set when the person reorders them. */
    position: number | null;
  };

export type RoutineRow = Timestamps &
  ReminderColumns & {
    id: Id;
    title: string;
    notes: string | null;
    time: LocalTime;
    /** Bitmask, bit 0 = Sunday ... bit 6 = Saturday. 127 = every day. */
    weekdays: number;
    start_date: LocalDate;
    symbol: string | null;
    image_uri: string | null;
    paused: Bool;
  };

export type OccurrenceOverrideRow = Timestamps & {
  id: Id;
  routine_id: Id;
  /** The date the routine would normally generate this occurrence. */
  occurrence_date: LocalDate;
  status: CompletionStatus;
  status_changed_at: Timestamp | null;
  title: string | null;
  notes: string | null;
  moved_date: LocalDate | null;
  moved_time: LocalTime | null;
  reminder_enabled: Bool | null;
};

export type ClothingCategory =
  'top' | 'bottom' | 'full_body' | 'outerwear' | 'footwear' | 'accessory';

export type ClothingOptionRow = Timestamps & {
  id: Id;
  label: string;
  category: ClothingCategory;
  allowed: Bool;
  excluded: Bool;
};

export type WeatherLocationMode = 'off' | 'device' | 'manual';

export type WeatherLocationSettingsRow = Timestamps & {
  id: 1;
  mode: WeatherLocationMode;
  manual_label: string | null;
  manual_latitude: number | null;
  manual_longitude: number | null;
};

export type PreferenceRow = Timestamps & { key: string; value: string };

/** Typed preference keys; each value is stored as JSON text. */
export type PreferenceValues = {
  'display.textScale': number;
  'display.density': 'comfortable' | 'compact';
  'display.colorTheme': string;
  'display.motion': 'system' | 'on' | 'off';
  'display.haptics': boolean;
  'display.taskActions': 'compact' | 'buttons';
  'display.picturesFirst': boolean;
  'display.readAloud': boolean;
  'display.completionMoment': 'none' | 'check' | 'checkSound';
  /** The user chose "Not now" on the reminder explanation shown on Today. */
  'reminders.promptDismissed': boolean;
  'reminders.defaultAdvanceMinutes': number;
  'reminders.snoozeMinutes': number;
  'reminders.quietHours': { enabled: boolean; start: LocalTime; end: LocalTime };
  'reminders.sound': boolean;
  'reminders.vibration': boolean;
  /** Clothing suggestions dismissed on one local day (`YYYY-MM-DD`); other days start fresh. */
  'clothing.dismissed': { date: string };
  'weather.enabled': boolean;
  'weather.units': 'metric' | 'imperial';
  /** The single cached forecast (JSON); validated on read by features/weather/forecastCache.ts. */
  'weather.forecastCache': unknown;
  /** The unsent feedback form (JSON); validated on read by features/feedback/feedbackDraft.ts. */
  'feedback.draft': unknown;
};

export type PreferenceKey = keyof PreferenceValues;
