import { isSymbolId } from '@/features/pictures/symbols';
import { formToRoutineInput } from './routineForm';
import { findTemplate, ROUTINE_TEMPLATES, templateToForm } from './templates';

describe('routine templates', () => {
  it('offers the four templates with unique ids', () => {
    expect(ROUTINE_TEMPLATES.map((t) => t.title)).toEqual([
      'Morning',
      'Bedtime',
      'School day',
      'Leaving the house',
    ]);
    expect(new Set(ROUTINE_TEMPLATES.map((t) => t.id)).size).toBe(ROUTINE_TEMPLATES.length);
  });

  it.each(ROUTINE_TEMPLATES.map((t) => [t.title, t] as const))('%s is valid', (_n, t) => {
    expect(t.title.trim()).not.toBe('');
    expect(t.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    expect(t.weekdays.length).toBeGreaterThan(0);
    for (const d of t.weekdays) expect(Number.isInteger(d) && d >= 0 && d <= 6).toBe(true);
    expect(isSymbolId(t.symbol)).toBe(true);
    expect(t.steps.length).toBeGreaterThan(0);
    for (const s of t.steps) expect(s.trim()).not.toBe('');
  });

  it('School day runs Monday to Friday', () => {
    expect(findTemplate('school-day')?.weekdays).toEqual([1, 2, 3, 4, 5]);
  });

  it('finds templates by id and returns null otherwise', () => {
    expect(findTemplate('morning')?.title).toBe('Morning');
    expect(findTemplate('nope')).toBeNull();
    expect(findTemplate(undefined)).toBeNull();
  });

  it('pre-fills a form that converts to a routine input, with the steps in the notes', () => {
    for (const t of ROUTINE_TEMPLATES) {
      const form = templateToForm(t, '2026-10-22');
      expect(form.startDate).toBe('2026-10-22');
      expect(form.imageUri).toBe('');
      const input = formToRoutineInput(form);
      expect(input.title).toBe(t.title);
      expect(input.weekdays).toEqual(t.weekdays);
      expect(input.symbol).toBe(t.symbol);
      expect(input.notes?.split('\n')).toEqual(t.steps.map((s) => `- ${s}`));
    }
  });

  it('does not share the weekdays array with the template', () => {
    const t = ROUTINE_TEMPLATES[0];
    const form = templateToForm(t, '2026-10-22');
    form.weekdays.push(9);
    expect(t.weekdays).not.toContain(9);
  });
});
