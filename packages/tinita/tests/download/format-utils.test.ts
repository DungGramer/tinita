import { describe, it, expect } from 'vitest';
import { formatBytes } from '../../src/download/format-bytes';
import { formatDuration } from '../../src/download/format-duration';

describe('formatBytes()', () => {
  it('returns "--" for null', () => {
    expect(formatBytes(null)).toBe('--');
  });

  it('returns "--" for negative values', () => {
    expect(formatBytes(-1)).toBe('--');
    expect(formatBytes(-1024)).toBe('--');
  });

  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns bytes for small values', () => {
    expect(formatBytes(1023)).toBe('1023.00 B');
  });

  it('returns KB for 1024 bytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
  });

  it('returns 1.50 KB for 1536 bytes', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
  });

  it('returns MB for 1048576 bytes', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });

  it('returns GB for 1073741824 bytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('respects custom decimals parameter', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
    expect(formatBytes(1024, 3)).toBe('1.000 KB');
  });

  it('defaults to 2 decimal places', () => {
    expect(formatBytes(2048)).toBe('2.00 KB');
  });
});

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
