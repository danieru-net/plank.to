import type { Forecast } from '@/features/weather/forecast';
import {
  OUTFITS,
  forecastForSuggestions,
  outfitFor,
  toCelsius,
  weatherFacts,
} from './suggestionRules';
import { clothingCopy, clothingNote } from './clothingCopy';

const forecast = (o: Partial<Forecast> = {}): Forecast =>
  ({
    units: 'metric',
    current: { time: '2026-01-01T12:00', temperature: 23, weatherCode: 0 },
    daily: [{ date: '2026-01-01', temperatureMax: 23, temperatureMin: 15, weatherCode: 0 }],
    ...o,
  }) as unknown as Forecast;

describe('outfitFor', () => {
  it.each([
    [-10, 'very_cold'],
    [4.9, 'very_cold'],
    [5, 'cold'],
    [14.9, 'cold'],
    [15, 'warm'],
    [23, 'warm'],
    [27.9, 'warm'],
    [28, 'very_hot'],
    [40, 'very_hot'],
  ])('%s°C is %s', (c, id) => {
    expect(outfitFor(c).id).toBe(id);
  });

  it('suggests a t-shirt and light trousers or shorts at 23°C', () => {
    const o = outfitFor(23);
    expect(o.top).toMatch(/t-shirt/i);
    expect(o.bottom).toMatch(/shorts/i);
  });

  it('has a top and bottom for every band', () => {
    for (const o of OUTFITS) {
      expect(o.top).not.toBe('');
      expect(o.bottom).not.toBe('');
    }
  });
});

describe('weather facts', () => {
  it('converts imperial to Celsius', () => {
    expect(toCelsius(44.6, 'imperial')).toBe(7);
    const f = weatherFacts(
      forecast({
        units: 'imperial',
        current: { time: '2026-01-01T12:00', temperature: 73.4, weatherCode: 0 },
        daily: [{ date: '2026-01-01', temperatureMax: 73.4, temperatureMin: 59, weatherCode: 0 }],
      } as Partial<Forecast>),
    );
    expect(f?.highC).toBe(23);
  });

  it('returns null without a finite temperature', () => {
    expect(
      weatherFacts(
        forecast({
          current: { time: '2026-01-01T12:00', temperature: NaN, weatherCode: 0 },
        } as Partial<Forecast>),
      ),
    ).toBeNull();
  });

  it('offers no forecast while weather is not ready', () => {
    expect(forecastForSuggestions({ status: 'loading' } as never)).toBeNull();
  });
});

describe('wording', () => {
  it('avoids prescriptive and gendered phrasing', () => {
    const text = [
      clothingNote,
      ...Object.values(clothingCopy),
      ...OUTFITS.flatMap((o) => [o.label, o.top, o.bottom]),
    ].join(' ');
    expect(text).not.toMatch(/\b(you should|you must|men'?s|women'?s|unisex|safe|health\w*)\b/i);
  });
});
