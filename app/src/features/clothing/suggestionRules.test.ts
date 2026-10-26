import type { Forecast } from '@/features/weather/forecast';
import {
  EXTRA_LABELS,
  OUTFITS,
  type WeatherFacts,
  dayFeelC,
  extrasFor,
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
    hourly: [],
    ...o,
  }) as unknown as Forecast;

describe('outfitFor', () => {
  it.each([
    [-5, -12, 'freezing'],
    [5, -1, 'freezing'], // feels 2.6
    [5, 0, 'cold'], // feels 3
    [12, 4, 'cold'], // feels 8.8
    [16, 10, 'cool'], // feels 13.6
    [18, 10, 'cool'], // feels 14.8
    [19, 9, 'mild'], // feels 15
    [23, 15, 'mild'], // feels 19.8
    [24, 14, 'warm'], // feels 20
    [30, 18, 'warm'], // feels 25.2
    [32, 18, 'hot'], // feels 26.4
    [40, 28, 'hot'],
  ])('high %s°C, low %s°C is %s', (high, low, id) => {
    expect(outfitFor(high, low).id).toBe(id);
  });

  it('does not suggest a t-shirt alone for a 16°C high and 10°C low', () => {
    const o = outfitFor(16, 10);
    expect(o.top).toMatch(/jacket/i);
    expect(o.bottom).not.toMatch(/shorts/i);
  });

  it('suggests a t-shirt and light trousers or shorts on a warm day', () => {
    const o = outfitFor(27, 18);
    expect(o.top).toMatch(/t-shirt/i);
    expect(o.bottom).toMatch(/shorts/i);
  });

  it('weights the high more than the low', () => {
    expect(dayFeelC(16, 10)).toBe(13.6);
    expect(dayFeelC(20, 20)).toBe(20);
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

  describe('windKmh', () => {
    const hour = (time: string, windSpeed: number | null) => ({ time, windSpeed });

    it("uses the highest of today's hourly winds only", () => {
      const f = weatherFacts(
        forecast({
          hourly: [
            hour('2026-01-01T09:00', 12),
            hour('2026-01-01T15:00', 31),
            hour('2026-01-02T09:00', 80),
          ],
        } as unknown as Partial<Forecast>),
      );
      expect(f?.windKmh).toBe(31);
    });

    it('converts mph to km/h', () => {
      const f = weatherFacts(
        forecast({
          units: 'imperial',
          current: { time: '2026-01-01T12:00', temperature: 73.4, weatherCode: 0 },
          hourly: [hour('2026-01-01T09:00', 10)],
        } as unknown as Partial<Forecast>),
      );
      expect(f?.windKmh).toBe(16.09);
    });

    it('falls back to the current wind', () => {
      const f = weatherFacts(
        forecast({
          current: { time: '2026-01-01T12:00', temperature: 23, weatherCode: 0, windSpeed: 18 },
          hourly: [hour('2026-01-02T09:00', 80)],
        } as unknown as Partial<Forecast>),
      );
      expect(f?.windKmh).toBe(18);
    });

    it('is null when the wind is unknown', () => {
      expect(weatherFacts(forecast())?.windKmh).toBeNull();
      const f = weatherFacts(
        forecast({
          current: { time: '2026-01-01T12:00', temperature: 23, weatherCode: 0, windSpeed: null },
          hourly: [hour('2026-01-01T09:00', null)],
        } as unknown as Partial<Forecast>),
      );
      expect(f?.windKmh).toBeNull();
    });
  });

  it('offers no forecast while weather is not ready', () => {
    expect(forecastForSuggestions({ status: 'loading' } as never)).toBeNull();
  });
});

const facts = (o: Partial<WeatherFacts> = {}): WeatherFacts => ({
  highC: 20,
  lowC: 15,
  precipChance: 0,
  wet: false,
  snowy: false,
  sunny: false,
  windKmh: 0,
  ...o,
});

const ids = (o: Partial<WeatherFacts>) => extrasFor(facts(o)).map((e) => e.id);

describe('extrasFor', () => {
  it('returns nothing on a calm day', () => {
    expect(extrasFor(facts())).toEqual([]);
    expect(extrasFor(facts({ precipChance: null, windKmh: null }))).toEqual([]);
  });

  it('suggests rain gear at 50% or when wet', () => {
    expect(ids({ precipChance: 50, highC: 18 })).toEqual(['rain']);
    expect(ids({ precipChance: 49, highC: 18 })).not.toContain('rain');
    expect(ids({ wet: true, highC: 18 })).toContain('rain');
  });

  it('lightens the rain jacket from 20°C', () => {
    const label = (highC: number) =>
      extrasFor(facts({ wet: true, highC, lowC: highC })).find((e) => e.id === 'rain')?.label;
    expect(label(20)).toBe(EXTRA_LABELS.rainLight);
    expect(label(19.9)).toBe(EXTRA_LABELS.rain);
  });

  it('suggests a small umbrella at 30 to 49% but not alongside rain', () => {
    expect(ids({ precipChance: 30 })).toEqual(['umbrella_maybe']);
    expect(ids({ precipChance: 49 })).toEqual(['umbrella_maybe']);
    expect(ids({ precipChance: 29 })).toEqual([]);
    expect(ids({ precipChance: 50 })).not.toContain('umbrella_maybe');
    expect(ids({ wet: true, precipChance: 40 })).not.toContain('umbrella_maybe');
  });

  it('suggests waterproof boots for snow and dry shoes for cold rain', () => {
    expect(ids({ snowy: true, highC: 5, lowC: 5 })).toContain('boots');
    expect(ids({ snowy: true, wet: true, highC: 5, lowC: 5 })).not.toContain('rain_shoes');
    expect(ids({ wet: true, highC: 14.9, lowC: 14.9 })).toContain('rain_shoes');
    expect(ids({ wet: true, highC: 15, lowC: 15 })).not.toContain('rain_shoes');
  });

  it('suggests a hat and gloves at a low of 2°C or in snow', () => {
    expect(ids({ lowC: 2 })).toContain('hat_gloves');
    expect(ids({ lowC: 2.1 })).not.toContain('hat_gloves');
    expect(ids({ snowy: true, lowC: 10 })).toContain('hat_gloves');
  });

  it('suggests a windproof layer from 30 km/h unless very hot', () => {
    expect(ids({ windKmh: 30 })).toContain('wind');
    expect(ids({ windKmh: 29.9 })).not.toContain('wind');
    expect(ids({ windKmh: 30, highC: 27.9, lowC: 27.9 })).toContain('wind');
    expect(ids({ windKmh: 30, highC: 28, lowC: 28 })).not.toContain('wind');
    expect(ids({ windKmh: null })).not.toContain('wind');
  });

  it('suggests an extra layer for a swing of 10°C at 15°C or above', () => {
    expect(ids({ highC: 15, lowC: 5 })).toContain('layer');
    expect(ids({ highC: 15, lowC: 5.1 })).not.toContain('layer');
    expect(ids({ highC: 14.9, lowC: 4 })).not.toContain('layer');
  });

  it('suggests sun gear only when sunny and 20°C or above', () => {
    expect(ids({ sunny: true, highC: 20 })).toEqual(['sun']);
    expect(ids({ sunny: true, highC: 19.9, lowC: 19.9 })).not.toContain('sun');
    expect(ids({ sunny: false, highC: 25, lowC: 25 })).not.toContain('sun');
  });

  it('keeps rules in a fixed order', () => {
    expect(ids({ wet: true, highC: 12, lowC: 1, windKmh: 40 })).toEqual([
      'rain',
      'rain_shoes',
      'hat_gloves',
      'wind',
    ]);
  });
});

describe('wording', () => {
  it('avoids prescriptive and gendered phrasing', () => {
    const text = [
      clothingNote,
      ...Object.values(clothingCopy),
      ...OUTFITS.flatMap((o) => [o.label, o.top, o.bottom]),
      ...Object.values(EXTRA_LABELS),
    ].join(' ');
    expect(text).not.toMatch(/\b(you should|you must|men'?s|women'?s|unisex|safe|health\w*)\b/i);
  });
});
