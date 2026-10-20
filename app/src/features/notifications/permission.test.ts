import { permissionStatusText, reminderExplanation, toReminderPermission } from './permission';

describe('toReminderPermission', () => {
  it('maps granted responses, including iOS provisional ones flagged granted', () => {
    expect(toReminderPermission({ status: 'granted', granted: true })).toBe('granted');
    expect(toReminderPermission({ status: 'undetermined', granted: true })).toBe('granted');
  });

  it('maps denied and undetermined responses', () => {
    expect(toReminderPermission({ status: 'denied', granted: false })).toBe('denied');
    expect(toReminderPermission({ status: 'undetermined', granted: false })).toBe('undetermined');
  });

  it('treats an unknown status as undetermined', () => {
    expect(toReminderPermission({ status: 'weird', granted: false })).toBe('undetermined');
  });
});

describe('copy', () => {
  it('has text for every state and states reminders are optional', () => {
    expect(Object.keys(permissionStatusText).sort()).toEqual(['denied', 'granted', 'undetermined']);
    expect(reminderExplanation).toMatch(/optional/i);
  });
});
