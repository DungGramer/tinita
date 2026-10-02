import { describe, expect, it } from 'vitest';
import { PAGE_SIZES } from '../src/print/pageSizes';
import { convertLength } from '../src/unit/convertLength';
import {
  PRINT_DPI,
  fromPrintPixels,
  toPrintPixels,
} from '../src/unit/printPixels';

describe('toPrintPixels', () => {
  it('gives A4 at 300 DPI as 2480 x 3508', () => {
    // Exactly the pair that sat in the old PRINT_TYPE table as `2480 / 3508`. The need
    // was real; measuring the number instead of being given it was the mistake.
    const [width, height] = PAGE_SIZES.A4;
    expect(Math.round(toPrintPixels(width, 'mm', PRINT_DPI.offset))).toBe(2480);
    expect(Math.round(toPrintPixels(height, 'mm', PRINT_DPI.offset))).toBe(
      3508
    );
  });

  it('is exact for inches, where the arithmetic is trivial', () => {
    expect(toPrintPixels(1, 'in', 300)).toBe(300);
    expect(toPrintPixels(4, 'in', 600)).toBe(2400);
    expect(toPrintPixels(8.5, 'in', 150)).toBe(1275);
  });

  it('answers a DIFFERENT question from convertLength', () => {
    // Asserted side by side so the two can never be confused in review: one is a
    // layout number in CSS pixels, the other a raster size at a chosen resolution.
    expect(convertLength(210, 'mm', 'px')).toBeCloseTo(793.7, 1);
    expect(toPrintPixels(210, 'mm', 300)).toBeCloseTo(2480.31, 2);
  });

  it('does NOT round, and the JSDoc says why', () => {
    // Rounding policy belongs to the caller: ceil for a page, round for a photo,
    // floor when tiling. Rounding here would also make a ratio of two results wrong.
    expect(toPrintPixels(210, 'mm', 300) % 1).not.toBe(0);
    expect(Math.ceil(toPrintPixels(210, 'mm', 300))).toBe(2481);
    expect(Math.floor(toPrintPixels(210, 'mm', 300))).toBe(2480);
  });

  it('scales linearly with dpi', () => {
    const at150 = toPrintPixels(100, 'mm', 150);
    expect(toPrintPixels(100, 'mm', 300)).toBeCloseTo(at150 * 2, 9);
    expect(toPrintPixels(100, 'mm', 600)).toBeCloseTo(at150 * 4, 9);
  });

  it('every PRINT_DPI preset is a positive integer', () => {
    for (const [name, dpi] of Object.entries(PRINT_DPI)) {
      expect(Number.isInteger(dpi), name).toBe(true);
      expect(dpi, name).toBeGreaterThan(0);
    }
    expect(PRINT_DPI).toEqual({
      draft: 72,
      photo: 150,
      offset: 300,
      lineArt: 600,
    });
  });

  it('draft DPI agrees with the CSS point, which is 1/72 inch by definition', () => {
    expect(toPrintPixels(1, 'in', PRINT_DPI.draft)).toBe(
      convertLength(1, 'in', 'pt')
    );
  });

  it('throws on a dpi that is not a positive finite number', () => {
    for (const dpi of [0, -300, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => toPrintPixels(1, 'in', dpi), String(dpi)).toThrow(TypeError);
    }
  });

  it('names WHICH failure, not just that one happened', () => {
    // assertDpi delegates to assertPositiveFiniteNumber, which reports the type
    // problem before the sign problem. That ordering is the point: passing '300'
    // is a different mistake from passing -300, and one message for both would
    // send the caller looking in the wrong place.
    const message = (dpi: unknown) => {
      try {
        // @ts-expect-error deliberately wrong type in some cases
        toPrintPixels(1, 'in', dpi);
      } catch (error) {
        return (error as Error).message;
      }

      return '(did not throw)';
    };

    expect(message('300')).toBe(
      'toPrintPixels: dpi must be a finite number, got string'
    );
    expect(message(Number.NaN)).toBe(
      'toPrintPixels: dpi must be a finite number, got NaN'
    );
    expect(message(Number.POSITIVE_INFINITY)).toBe(
      'toPrintPixels: dpi must be a finite number, got Infinity'
    );
    expect(message(-300)).toBe(
      'toPrintPixels: dpi must be a positive finite number, got -300'
    );
    expect(message(0)).toBe(
      'toPrintPixels: dpi must be a positive finite number, got 0'
    );
  });

  it('every message names the public API that rejected the value', () => {
    // The whole reason assertions take a `caller`. With one helper shared by many
    // APIs, a message without it cannot say who refused.
    const refusedBy = (fn: () => unknown) => {
      try {
        fn();
      } catch (error) {
        return (error as Error).message.split(':')[0];
      }

      return '(did not throw)';
    };

    // @ts-expect-error deliberately wrong type
    expect(refusedBy(() => toPrintPixels(1, 'in', '300'))).toBe(
      'toPrintPixels'
    );
    // @ts-expect-error deliberately wrong type
    expect(refusedBy(() => fromPrintPixels(1, 'in', '300'))).toBe(
      'fromPrintPixels'
    );
    expect(refusedBy(() => fromPrintPixels(Number.NaN, 'mm', 300))).toBe(
      'fromPrintPixels'
    );
  });

  it('throws through convertLength for a bad unit or value', () => {
    // @ts-expect-error deliberately wrong unit
    expect(() => toPrintPixels(1, 'em', 300)).toThrow(TypeError);
    expect(() => toPrintPixels(Number.NaN, 'mm', 300)).toThrow(TypeError);
  });
});

describe('fromPrintPixels', () => {
  it('answers "does this scan fit A4"', () => {
    expect(fromPrintPixels(2480, 'mm', 300)).toBeCloseTo(209.97, 2);
    expect(fromPrintPixels(2480, 'mm', 300)).toBeLessThan(PAGE_SIZES.A4[0]);
  });

  it('round-trips with toPrintPixels at the same dpi, every unit', () => {
    for (const unit of ['px', 'in', 'cm', 'mm', 'pt', 'pc', 'q'] as const) {
      for (const dpi of Object.values(PRINT_DPI)) {
        expect(
          fromPrintPixels(toPrintPixels(7, unit, dpi), unit, dpi),
          `${unit} @ ${dpi}`
        ).toBeCloseTo(7, 9);
      }
    }
  });

  it('throws on a bad dpi or a non-finite pixel count', () => {
    expect(() => fromPrintPixels(2480, 'mm', 0)).toThrow(TypeError);
    expect(() => fromPrintPixels(Number.NaN, 'mm', 300)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => fromPrintPixels('2480', 'mm', 300)).toThrow(TypeError);
  });
});
