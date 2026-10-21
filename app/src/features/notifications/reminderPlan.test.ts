import type { Routine } from '@/db/routineRepository';
import type { Task } from '@/db/taskRepository';
import type { RoutineOccurrence } from '@/features/routines/routineAgenda';
import {
  boundReminders,
  diffReminders,
  loadReminderPlan,
  planRoutineReminders,
  planTaskReminders,
  routineReminderId,
  taskReminderId,
  type PlannedReminder,
  type ScheduledReminder,
} from './reminderPlan';

const now = new Date(2026, 5, 10, 12, 0); // 2026-06-10 12:00 local

const task = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Call',
  notes: null,
  date: '2026-06-10',
  time: '15:00',
  imageUri: null,
  status: 'pending',
  statusChangedAt: null,
  reminderEnabled: true,
  reminderAdvanceMinutes: 0,
  routineId: null,
  routineOccurrenceDate: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  title: 'Shower',
  notes: null,
  time: '19:00',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-06-01',
  imageUri: null,
  paused: false,
  reminderEnabled: true,
  reminderAdvanceMinutes: 0,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('quiet hours in the plan', () => {
  const quiet = { enabled: true, start: '14:40', end: '14:55' };

  it('delays a task reminder to the end of quiet hours', () => {
    const [r] = planTaskReminders([task({ reminderAdvanceMinutes: 10 })], now, quiet);
    expect(r?.fireAt).toEqual(new Date(2026, 5, 10, 14, 55));
  });

  it('skips a reminder that would land after the task itself', () => {
    const late = { enabled: true, start: '14:40', end: '15:30' };
    expect(planTaskReminders([task({ reminderAdvanceMinutes: 10 })], now, late)).toEqual([]);
  });

  it('applies to routine reminders too', () => {
    const items: RoutineOccurrence[] = [
      {
        routineId: 'r1',
        details: { date: '2026-06-10', time: '15:00', title: 'Shower', notes: null },
        occurrence: {
          occurrenceDate: '2026-06-10',
          status: 'pending',
          reminderEnabled: null,
        },
      } as unknown as RoutineOccurrence,
    ];
    const [r] = planRoutineReminders(
      items,
      new Map([['r1', routine({ reminderAdvanceMinutes: 30 })]]),
      now,
      { enabled: true, start: '14:00', end: '14:45' },
    );
    expect(r?.fireAt).toEqual(new Date(2026, 5, 10, 14, 45));
  });
});

describe('planTaskReminders', () => {
  it('plans a timed pending task at its time minus the advance notice', () => {
    const [r] = planTaskReminders([task({ reminderAdvanceMinutes: 10 })], now);
    expect(r?.id).toBe(taskReminderId('t1'));
    expect(r?.fireAt).toEqual(new Date(2026, 5, 10, 14, 50));
  });

  it('skips disabled, untimed, finished, and already-past reminders', () => {
    const tasks = [
      task({ reminderEnabled: false }),
      task({ time: null }),
      task({ status: 'completed' }),
      task({ status: 'dismissed' }),
      task({ time: '11:00' }),
      task({ time: '12:30', reminderAdvanceMinutes: 60 }),
    ];
    expect(planTaskReminders(tasks, now)).toEqual([]);
  });
});

describe('planRoutineReminders', () => {
  const item = (over: Partial<RoutineOccurrence['occurrence']> = {}): RoutineOccurrence => ({
    routineId: 'r1',
    occurrence: {
      occurrenceDate: '2026-06-10',
      date: '2026-06-10',
      time: '19:00',
      status: 'pending',
      title: null,
      notes: null,
      reminderEnabled: null,
      moved: false,
      ...over,
    },
    details: { title: 'Shower', notes: null, date: '2026-06-10', time: '19:00' },
  });
  const map = new Map([['r1', routine()]]);

  it('uses the occurrence identity for the identifier and the routine settings', () => {
    const [r] = planRoutineReminders([item()], map, now);
    expect(r?.id).toBe(routineReminderId('r1', '2026-06-10'));
    expect(r?.fireAt).toEqual(new Date(2026, 5, 10, 19, 0));
  });

  it('keeps the original date in the identifier when moved', () => {
    const moved = item({ moved: true });
    moved.details = { ...moved.details, date: '2026-06-11', time: '08:00' };
    const [r] = planRoutineReminders([moved], map, now);
    expect(r?.id).toBe('routine:r1:2026-06-10');
    expect(r?.fireAt).toEqual(new Date(2026, 5, 11, 8, 0));
  });

  it('lets a per-day override turn the reminder off or on', () => {
    expect(planRoutineReminders([item({ reminderEnabled: false })], map, now)).toEqual([]);
    const off = new Map([['r1', routine({ reminderEnabled: false })]]);
    expect(planRoutineReminders([item()], off, now)).toEqual([]);
    expect(planRoutineReminders([item({ reminderEnabled: true })], off, now)).toHaveLength(1);
  });

  it('skips dismissed and completed occurrences', () => {
    expect(planRoutineReminders([item({ status: 'dismissed' })], map, now)).toEqual([]);
    expect(planRoutineReminders([item({ status: 'completed' })], map, now)).toEqual([]);
  });
});

describe('boundReminders', () => {
  const make = (id: string, minute: number): PlannedReminder => ({
    id,
    fireAt: new Date(2026, 5, 11, 9, minute),
    title: id,
    body: null,
    data: { kind: 'task', date: '2026-06-11' },
  });

  it('sorts by time, de-duplicates by id, and caps the count', () => {
    const out = boundReminders([make('b', 5), make('a', 1), make('b', 5), make('c', 3)], 2);
    expect(out.map((r) => r.id)).toEqual(['a', 'c']);
  });
});

describe('loadReminderPlan', () => {
  it('produces a daily 7 PM routine reminder for each day left in the window', async () => {
    const plan = await loadReminderPlan(
      { listTasksForDate: async () => [] },
      {
        listRoutines: async () => [routine()],
        listOccurrenceOverrides: async () => [],
      },
      now,
      3,
    );
    expect(plan.map((r) => r.id)).toEqual([
      'routine:r1:2026-06-10',
      'routine:r1:2026-06-11',
      'routine:r1:2026-06-12',
    ]);
  });

  it('ignores paused routines', async () => {
    const plan = await loadReminderPlan(
      { listTasksForDate: async () => [] },
      {
        listRoutines: async () => [routine({ paused: true })],
        listOccurrenceOverrides: async () => [],
      },
      now,
    );
    expect(plan).toEqual([]);
  });
});

describe('diffReminders', () => {
  const planned = (id: string, over: Partial<PlannedReminder> = {}): PlannedReminder => ({
    id,
    fireAt: new Date(2026, 5, 10, 15, 0),
    title: 'Call',
    body: null,
    data: { kind: 'task', taskId: 't1', date: '2026-06-10' },
    ...over,
  });
  const scheduled = (id: string, over: Partial<ScheduledReminder> = {}): ScheduledReminder => ({
    id,
    fireAt: new Date(2026, 5, 10, 15, 0).getTime(),
    title: 'Call',
    body: null,
    ...over,
  });

  it('schedules missing reminders and leaves matching ones alone', () => {
    const plan = [planned('task:t1'), planned('task:t2')];
    const diff = diffReminders(plan, [scheduled('task:t1')]);
    expect(diff.toSchedule.map((p) => p.id)).toEqual(['task:t2']);
    expect(diff.toCancel).toEqual([]);
  });

  it('reschedules when the time, title, or notes changed', () => {
    const plan = [planned('task:t1'), planned('task:t2'), planned('task:t3', { body: 'new' })];
    const diff = diffReminders(plan, [
      scheduled('task:t1', { fireAt: 1 }),
      scheduled('task:t2', { title: 'Old' }),
      scheduled('task:t3'),
    ]);
    expect(diff.toSchedule.map((p) => p.id)).toEqual(['task:t1', 'task:t2', 'task:t3']);
  });

  it('reschedules when the scheduled time cannot be read', () => {
    const diff = diffReminders([planned('task:t1')], [scheduled('task:t1', { fireAt: null })]);
    expect(diff.toSchedule).toHaveLength(1);
  });

  it('cancels stale reminders of ours but never foreign identifiers', () => {
    const diff = diffReminders(
      [planned('task:t1')],
      [
        scheduled('task:t1'),
        scheduled('task:gone'),
        scheduled('routine:r1:2026-06-10'),
        scheduled('something-else'),
      ],
    );
    expect(diff.toCancel).toEqual(['task:gone', 'routine:r1:2026-06-10']);
    expect(diff.toSchedule).toEqual([]);
  });

  it('cancels everything of ours when nothing is planned', () => {
    expect(diffReminders([], [scheduled('task:t1')]).toCancel).toEqual(['task:t1']);
  });
});
