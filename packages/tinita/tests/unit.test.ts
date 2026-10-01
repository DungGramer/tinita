import { describe, expect, it } from 'vitest';
import { convertLength } from '../src/unit/convertLength';

describe('convertLength', () => {
  it('uses the exact ratios the CSS spec fixes', () => {
    // 1in = 96px = 2.54cm = 25.4mm = 72pt = 6pc, by specification. None of these is
    // measured, and none depends on the device.
    expect(convertLength(1, 'in', 'px')).toBe(96);
    expect(convertLength(1, 'in', 'cm')).toBeCloseTo(2.54, 12);
    expect(convertLength(1, 'in', 'mm')).toBeCloseTo(25.4, 12);
    expect(convertLength(1, 'in', 'pt')).toBeCloseTo(72, 12);
    expect(convertLength(1, 'in', 'pc')).toBeCloseTo(6, 12);
    expect(convertLength(1, 'mm', 'q')).toBeCloseTo(4, 12);
  });

  it('is 96, not the 96.012 the old DPI probe derived', () => {
    // Measured 2026-10-01: the class this replaced read offsetHeight off a 100mm div
    // and derived 96.012 from its integer rounding, then hard-coded
    // 96.01199999999999 as a fallback.
    expect(convertLength(1, 'in', 'px')).not.toBeCloseTo(96.012, 3);
    expect(convertLength(100, 'mm', 'px')).toBeCloseTo((100 / 25.4) * 96, 12);
  });

  it('round-trips every pair of units', () => {
    const units = ['px', 'in', 'cm', 'mm', 'pt', 'pc', 'q'] as const;
    for (const from of units) {
      for (const to of units) {
        expect(
          convertLength(convertLength(7, from, to), to, from),
          `${from}->${to}`
        ).toBeCloseTo(7, 10);
      }
    }
  });

  it('is the identity for the same unit, including an odd value', () => {
    expect(convertLength(0, 'mm', 'mm')).toBe(0);
    expect(convertLength(-3.5, 'pt', 'pt')).toBe(-3.5);
  });

  it('is PURE - no DOM, no cache, same answer every time', () => {
    // The class this replaced kept its rate table in a private static field that the
    // constructor overwrote, so a second converter broke the first.
    const once = convertLength(100, 'mm', 'px');
    for (let i = 0; i < 100; i += 1)
      expect(convertLength(100, 'mm', 'px')).toBe(once);
  });

  it('does NOT return 0 where there is no layout engine', () => {
    // In jsdom the old implementation measured offsetHeight 0 and so every px
    // conversion silently returned 0. This test runs in plain Node.
    expect(convertLength(100, 'mm', 'px')).toBeGreaterThan(0);
    expect(typeof document).toBe('undefined');
  });

  it('matches unit names case-insensitively', () => {
    // @ts-expect-error uppercase is accepted at runtime, not in the type
    expect(convertLength(1, 'IN', 'PX')).toBe(96);
  });

  it('throws naming the unknown unit and listing the known ones', () => {
    // @ts-expect-error deliberately wrong unit
    expect(() => convertLength(1, 'em', 'px')).toThrow(
      /"em" is not a CSS absolute length unit/
    );
    // @ts-expect-error deliberately wrong unit
    expect(() => convertLength(1, 'px', 'rem')).toThrow(
      /Known: px, in, cm, mm, q, pt, pc/
    );
  });

  it('throws on a non-finite value', () => {
    expect(() => convertLength(Number.NaN, 'mm', 'px')).toThrow(TypeError);
    expect(() => convertLength(Number.POSITIVE_INFINITY, 'mm', 'px')).toThrow(
      TypeError
    );
    // @ts-expect-error deliberately wrong type
    expect(() => convertLength('100', 'mm', 'px')).toThrow(TypeError);
  });
});
