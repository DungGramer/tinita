import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromDevicePixels, toDevicePixels } from '../src/unit/toDevicePixels';

const withRatio = (ratio: number) => vi.stubGlobal('devicePixelRatio', ratio);

afterEach(() => vi.unstubAllGlobals());

describe('toDevicePixels', () => {
  it('scales by devicePixelRatio - the number that DOES track the screen', () => {
    // Measured in Chromium 2026-10-01: probing a <div> returns the same 96.012 at
    // deviceScaleFactor 1, 1.5, 2 and 3, while devicePixelRatio reports 1, 1.5, 2, 3.
    // So this is where the display shows up, and the div probe never could.
    withRatio(1);
    expect(toDevicePixels(1, 'in')).toBe(96);
    withRatio(2);
    expect(toDevicePixels(1, 'in')).toBe(192);
    withRatio(3);
    expect(toDevicePixels(1, 'in')).toBe(288);
    withRatio(1.5);
    expect(toDevicePixels(100, 'px')).toBe(150);
  });

  it('defaults to px', () => {
    withRatio(2);
    expect(toDevicePixels(10)).toBe(20);
  });

  it('reads the ratio at CALL time, not at import time', () => {
    // It changes when the window moves to another display or the user zooms, so a
    // cached value would go stale silently.
    withRatio(1);
    const atOne = toDevicePixels(10);
    withRatio(2);
    expect(toDevicePixels(10)).toBe(atOne * 2);
  });

  it('falls back to a ratio of 1 where devicePixelRatio is absent or nonsense', () => {
    vi.stubGlobal('devicePixelRatio', undefined);
    expect(toDevicePixels(10)).toBe(10);
    vi.stubGlobal('devicePixelRatio', 0);
    expect(toDevicePixels(10)).toBe(10);
  });

  it('round-trips through fromDevicePixels at a fixed ratio', () => {
    withRatio(2.5);
    for (const unit of ['px', 'in', 'mm', 'cm', 'pt', 'pc'] as const) {
      expect(fromDevicePixels(toDevicePixels(7, unit), unit), unit).toBeCloseTo(
        7,
        10
      );
    }
  });

  it('throws through convertLength for a bad unit or value', () => {
    withRatio(1);
    // @ts-expect-error deliberately wrong unit
    expect(() => toDevicePixels(1, 'em')).toThrow(TypeError);
    expect(() => toDevicePixels(Number.NaN)).toThrow(TypeError);
    expect(() => fromDevicePixels(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

// fromDevicePixels đã assert từ đầu, toDevicePixels ngay trên nó thì chưa - hai hàm
// anh em trong một file, hai hình dạng. Trước đây toDevicePixels để convertLength ném.
describe('toDevicePixels names itself, not convertLength', () => {
  it('rejects a non-finite value under its own name', () => {
    expect(() => toDevicePixels('x' as never)).toThrow(TypeError);
    expect(() => toDevicePixels('x' as never)).toThrow(
      'toDevicePixels: value must be a finite number, got string'
    );
    expect(() => toDevicePixels(Number.NaN)).toThrow(
      'toDevicePixels: value must be a finite number, got NaN'
    );
  });

  it('matches fromDevicePixels, which already did this', () => {
    expect(() => fromDevicePixels('x' as never)).toThrow(
      'fromDevicePixels: value must be a finite number, got string'
    );
  });
});
