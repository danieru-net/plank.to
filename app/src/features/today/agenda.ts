import type { Task } from '@/db/taskRepository';

/** Adds whole days to a `YYYY-MM-DD` date using calendar arithmetic (safe across DST). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function formatDateHeading(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export type AgendaGroups = { timed: Task[]; untimed: Task[] };

/** Splits an already-ordered day list into timed (chronological) and untimed tasks. */
export function groupAgenda(tasks: Task[]): AgendaGroups {
  const timed = tasks
    .filter((t) => t.time !== null)
    .sort((a, b) => (a.time! < b.time! ? -1 : a.time! > b.time! ? 1 : a.createdAt - b.createdAt));
  const untimed = tasks.filter((t) => t.time === null);
  return { timed, untimed };
}

export function statusText(status: Task['status']): string | null {
  if (status === 'completed') return 'Done';
  if (status === 'dismissed') return 'Dismissed';
  return null;
}

/**
 * The first timed task still to do at or after the current local time, or null. Takes the timed
 * list already sorted by `groupAgenda`.
 */
export function nextTaskId(timed: Task[], now: Date): string | null {
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return (
    timed.find((t) => t.status === 'pending' && t.time !== null && t.time >= clock)?.id ?? null
  );
}
