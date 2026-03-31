import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../src/download/core/format-duration';

describe('formatDuration()', () => {
  it('returns "--" for null', () => {
    expect(formatDuration(null)).toBe('--');
  });

  it('returns "--" for negative values', () => {
    expect(formatDuration(-1)).toBe('--');
    expect(formatDuration(-1000)).toBe('--');
  });

  it('returns "< 1s" for 0 ms', () => {
    expect(formatDuration(0)).toBe('< 1s');
  });

  it('returns "< 1s" for 500 ms', () => {
    expect(formatDuration(500)).toBe('< 1s');
  });

  it('returns "< 1s" for values under 1000ms', () => {
    expect(formatDuration(999)).toBe('< 1s');
  });

  it('returns "1s" for 1000 ms', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('returns "1m 5s" for 65000 ms', () => {
    expect(formatDuration(65000)).toBe('1m 5s');
  });

  it('returns "1h 1m 1s" for 3661000 ms', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
  });

  it('returns "1h" for exactly 3600000 ms (no zero minutes/seconds)', () => {
    expect(formatDuration(3600000)).toBe('1h');
  });

  it('returns "2m" for exactly 120000 ms (no zero seconds)', () => {
    expect(formatDuration(120000)).toBe('2m');
  });

  it('returns "45s" for 45 seconds', () => {
    expect(formatDuration(45000)).toBe('45s');
  });
});
