/**
 * Device-wide reminder preferences (stored locally in the `preferences` table) and the pure
 * helpers that apply them. Per-task and per-routine choices (on/off, advance notice) live on
 * the task or routine itself.
 */
export type QuietHours = { enabled: boolean; start: string; end: string };

export type ReminderSettings = {
  /** Advance notice suggested when turning reminders on for a new task or routine. */
  defaultAdvanceMinutes: number;
  /** How long "Snooze" on a notification waits before reminding once more. */
  snoozeMinutes: number;
  quietHours: QuietHours;
  sound: boolean;
  vibration: boolean;
};

/** "At the time" first, then up to an hour before. Labels double as accessible names. */
export const advanceOptions = [
  { value: 0, label: 'At the time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
] as const;

export const snoozeOptions = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
] as const;

export const defaultReminderSettings: ReminderSettings = {
  defaultAdvanceMinutes: 10,
  snoozeMinutes: 10,
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  sound: true,
  vibration: true,
};

const isOption = (options: readonly { value: number }[], v: unknown): v is number =>
  options.some((o) => o.value === v);

/** Accepts "7:00" and "07:00"; returns the padded form or null when not a real time. */
export function parseClockTime(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

const minutesOfDay = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Reads stored preference values, ignoring anything missing or invalid (defaults apply). */
export function parseReminderSettings(stored: Record<string, unknown>): ReminderSettings {
  const d = defaultReminderSettings;
  const advance = stored['reminders.defaultAdvanceMinutes'];
  const snooze = stored['reminders.snoozeMinutes'];
  const quiet = stored['reminders.quietHours'] as Partial<QuietHours> | null | undefined;
  const start = parseClockTime(quiet?.start);
  const end = parseClockTime(quiet?.end);
  return {
    defaultAdvanceMinutes: isOption(advanceOptions, advance) ? advance : d.defaultAdvanceMinutes,
    snoozeMinutes: isOption(snoozeOptions, snooze) ? snooze : d.snoozeMinutes,
    quietHours:
      start && end ? { enabled: quiet?.enabled === true, start, end } : { ...d.quietHours },
    sound: typeof stored['reminders.sound'] === 'boolean' ? stored['reminders.sound'] : d.sound,
    vibration:
      typeof stored['reminders.vibration'] === 'boolean'
        ? stored['reminders.vibration']
        : d.vibration,
  };
}

/** Whether a quiet-hours window is active: on, with different start and end times. */
export function quietHoursActive(q: QuietHours): boolean {
  return q.enabled && q.start !== q.end;
}

/** True when a local clock time falls in [start, end); windows may cross midnight. */
export function isQuietAt(at: Date, q: QuietHours): boolean {
  if (!quietHoursActive(q)) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  const start = minutesOfDay(q.start);
  const end = minutesOfDay(q.end);
  return start < end ? now >= start && now < end : now >= start || now < end;
}

/**
 * Moves a reminder time that falls inside quiet hours to the moment quiet hours end, so it is
 * delayed rather than lost. Times outside quiet hours are returned unchanged.
 */
export function applyQuietHours(at: Date, q: QuietHours): Date {
  if (!isQuietAt(at, q)) return at;
  const [h, m] = [Number(q.end.slice(0, 2)), Number(q.end.slice(3, 5))];
  const sameDay = new Date(at.getFullYear(), at.getMonth(), at.getDate(), h, m);
  if (sameDay.getTime() > at.getTime()) return sameDay;
  return new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, h, m);
}

/** The Android channel for a sound/vibration choice. Channel behavior is fixed once created. */
export function reminderChannelFor(settings: Pick<ReminderSettings, 'sound' | 'vibration'>) {
  return `reminders-${settings.sound ? 'sound' : 'silent'}-${settings.vibration ? 'vibrate' : 'still'}`;
}
