import { emptyRoutineForm, type RoutineFormValues } from './routineForm';

/** A starting point for a new routine. People can change everything before saving. */
export type RoutineTemplate = {
  id: string;
  title: string;
  /** Short line shown in the list. */
  description: string;
  /** A symbol id from the symbol set. */
  symbol: string;
  /** Suggested time, 24-hour "HH:MM". */
  time: string;
  /** Suggested weekdays, 0 = Sunday ... 6 = Saturday. */
  weekdays: number[];
  /** Example steps, put in the notes one per line. */
  steps: string[];
};

export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  {
    id: 'morning',
    title: 'Morning',
    description: 'Get up, get dressed, breakfast',
    symbol: 'wake',
    time: '07:30',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    steps: ['Get up', 'Wash face', 'Get dressed', 'Breakfast', 'Brush teeth'],
  },
  {
    id: 'bedtime',
    title: 'Bedtime',
    description: 'Wind down, brush teeth, bed',
    symbol: 'bed',
    time: '20:30',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    steps: ['Put screens away', 'Pajamas', 'Brush teeth', 'Get into bed'],
  },
  {
    id: 'school-day',
    title: 'School day',
    description: 'Pack up and head out, Monday to Friday',
    symbol: 'school',
    time: '07:45',
    weekdays: [1, 2, 3, 4, 5],
    steps: ['Pack bag', 'Check the timetable', 'Lunch and water bottle', 'Shoes and coat', 'Leave'],
  },
  {
    id: 'leaving-the-house',
    title: 'Leaving the house',
    description: 'Things to pick up on the way out',
    symbol: 'shoes',
    time: '08:15',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    steps: ['Keys', 'Phone', 'Wallet or bag', 'Shoes and coat', 'Lock the door'],
  },
];

export function findTemplate(id: string | null | undefined): RoutineTemplate | null {
  return ROUTINE_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Form values for a new routine started from a template. The steps become a short list in the
 * notes. Nothing is saved until the person presses Save.
 */
export function templateToForm(
  template: RoutineTemplate,
  startDate: string,
  advance = 10,
): RoutineFormValues {
  return {
    ...emptyRoutineForm(startDate, advance),
    title: template.title,
    time: template.time,
    weekdays: [...template.weekdays],
    symbol: template.symbol,
    notes: template.steps.map((s) => `- ${s}`).join('\n'),
  };
}
