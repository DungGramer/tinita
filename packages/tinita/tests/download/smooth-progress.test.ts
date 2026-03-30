import { describe, it, expect } from 'vitest';
import { createSpeedSmoother } from '../../src/download/smooth-progress';

describe('createSpeedSmoother()', () => {
  it('current() returns null before first update', () => {
    const smoother = createSpeedSmoother();
    expect(smoother.current()).toBeNull();
  });

  it('first sample returns the raw value directly (no smoothing)', () => {
    const smoother = createSpeedSmoother();
    const result = smoother.update(1_000_000);
    expect(result).toBe(1_000_000);
    expect(smoother.current()).toBe(1_000_000);
  });

  it('subsequent samples apply EMA formula', () => {
    const smoother = createSpeedSmoother(0.3);
    smoother.update(1_000_000); // first sample, stored as-is
    const result = smoother.update(2_000_000);
    // EMA: 0.3 * 2_000_000 + 0.7 * 1_000_000 = 600_000 + 700_000 = 1_300_000
    expect(result).toBeCloseTo(1_300_000, 0);
    expect(smoother.current()).toBeCloseTo(1_300_000, 0);
  });

  it('EMA formula: alpha=0.3 across three samples', () => {
    const smoother = createSpeedSmoother(0.3);
    smoother.update(1_000_000);
    smoother.update(2_000_000); // => 1_300_000
    const third = smoother.update(500_000);
    // EMA: 0.3 * 500_000 + 0.7 * 1_300_000 = 150_000 + 910_000 = 1_060_000
    expect(third).toBeCloseTo(1_060_000, 0);
  });

  it('reset() clears state, current() returns null after reset', () => {
    const smoother = createSpeedSmoother();
    smoother.update(500_000);
    expect(smoother.current()).toBe(500_000);

    smoother.reset();
    expect(smoother.current()).toBeNull();
  });

  it('after reset(), next update is treated as first sample', () => {
    const smoother = createSpeedSmoother(0.3);
    smoother.update(1_000_000);
    smoother.update(2_000_000); // smoothed to 1_300_000
    smoother.reset();
    const result = smoother.update(3_000_000); // first sample after reset
    expect(result).toBe(3_000_000); // raw value, no smoothing
  });

  it('alpha=1.0 means no smoothing — always returns raw value', () => {
    const smoother = createSpeedSmoother(1.0);
    smoother.update(1_000_000);
    const second = smoother.update(2_000_000);
    // 1.0 * 2_000_000 + 0 * 1_000_000 = 2_000_000
    expect(second).toBe(2_000_000);
    const third = smoother.update(500_000);
    // 1.0 * 500_000 + 0 * 2_000_000 = 500_000
    expect(third).toBe(500_000);
  });

  it('alpha=0.0 means max smoothing — always returns first value', () => {
    const smoother = createSpeedSmoother(0.0);
    smoother.update(1_000_000); // first sample: raw stored
    const second = smoother.update(2_000_000);
    // 0 * 2_000_000 + 1 * 1_000_000 = 1_000_000
    expect(second).toBe(1_000_000);
    const third = smoother.update(3_000_000);
    // 0 * 3_000_000 + 1 * 1_000_000 = 1_000_000
    expect(third).toBe(1_000_000);
  });

  it('handles zero speed sample', () => {
    const smoother = createSpeedSmoother(0.3);
    smoother.update(1_000_000);
    const result = smoother.update(0);
    // 0.3 * 0 + 0.7 * 1_000_000 = 700_000
    expect(result).toBeCloseTo(700_000, 0);
  });

  it('default alpha is 0.3', () => {
    // Verify default alpha via two samples
    const smoother = createSpeedSmoother(); // default alpha=0.3
    smoother.update(1_000_000);
    const result = smoother.update(2_000_000);
    // 0.3 * 2_000_000 + 0.7 * 1_000_000 = 1_300_000
    expect(result).toBeCloseTo(1_300_000, 0);
  });
});
