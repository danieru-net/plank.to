import {
  advanceOptions,
  applyQuietHours,
  defaultReminderSettings,
  isQuietAt,
  parseClockTime,
  parseReminderSettings,
  reminderChannelFor,
} from './reminderSettings';

const night = { enabled: true, start: '22:00', end: '07:00' };
const day = { enabled: true, start: '13:00', end: '15:00' };
const at = (h: number, m = 0, d = 10) => new Date(2026, 5, d, h, m);

describe('parseReminderSettings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(parseReminderSettings({})).toEqual(defaultReminderSettings);
  });

  it('keeps valid stored values', () => {
    expect(
      parseReminderSettings({
        'reminders.defaultAdvanceMinutes': 30,
        'reminders.snoozeMinutes': 15,
        'reminders.quietHours': { enabled: true, start: '9:30', end: '06:00' },
        'reminders.sound': false,
        'reminders.vibration': false,
      }),
    ).toEqual({
      defaultAdvanceMinutes: 30,
      snoozeMinutes: 15,
      quietHours: { enabled: true, start: '09:30', end: '06:00' },
      sound: false,
      vibration: false,
    });
  });

  it('ignores invalid values', () => {
    const parsed = parseReminderSettings({
      'reminders.defaultAdvanceMinutes': 7,
      'reminders.snoozeMinutes': 'soon',
      'reminders.quietHours': { enabled: true, start: '25:00', end: '07:00' },
      'reminders.sound': 'yes',
    });
    expect(parsed).toEqual(defaultReminderSettings);
  });

  it('offers "at the time" as the first notice', () => {
    expect(advanceOptions[0].value).toBe(0);
  });
});

describe('parseClockTime', () => {
  it('pads and validates', () => {
    expect(parseClockTime('7:05')).toBe('07:05');
    expect(parseClockTime('23:59')).toBe('23:59');
    expect(parseClockTime('24:00')).toBeNull();
    expect(parseClockTime('12:60')).toBeNull();
    expect(parseClockTime('noon')).toBeNull();
    expect(parseClockTime(null)).toBeNull();
  });
});

describe('quiet hours', () => {
  it('detects times inside a window that crosses midnight', () => {
    expect(isQuietAt(at(23), night)).toBe(true);
    expect(isQuietAt(at(3), night)).toBe(true);
    expect(isQuietAt(at(22, 0), night)).toBe(true);
    expect(isQuietAt(at(7, 0), night)).toBe(false);
    expect(isQuietAt(at(12), night)).toBe(false);
  });

  it('detects times inside a same-day window', () => {
    expect(isQuietAt(at(14), day)).toBe(true);
    expect(isQuietAt(at(15), day)).toBe(false);
    expect(isQuietAt(at(12, 59), day)).toBe(false);
  });

  it('is never active when off or when start equals end', () => {
    expect(isQuietAt(at(23), { ...night, enabled: false })).toBe(false);
    expect(isQuietAt(at(23), { enabled: true, start: '22:00', end: '22:00' })).toBe(false);
  });

  it('moves a time inside quiet hours to when they end', () => {
    expect(applyQuietHours(at(23, 30), night)).toEqual(at(7, 0, 11));
    expect(applyQuietHours(at(3, 30), night)).toEqual(at(7, 0, 10));
    expect(applyQuietHours(at(14), day)).toEqual(at(15));
  });

  it('leaves other times unchanged', () => {
    const t = at(12);
    expect(applyQuietHours(t, night)).toBe(t);
    expect(applyQuietHours(at(23), { ...night, enabled: false })).toEqual(at(23));
  });
});

describe('reminderChannelFor', () => {
  it('has a distinct channel for each sound and vibration choice', () => {
    const ids = [
      reminderChannelFor({ sound: true, vibration: true }),
      reminderChannelFor({ sound: true, vibration: false }),
      reminderChannelFor({ sound: false, vibration: true }),
      reminderChannelFor({ sound: false, vibration: false }),
    ];
    expect(new Set(ids).size).toBe(4);
  });
});
