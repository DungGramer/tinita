import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRetryableError, parseRetryAfterMs } from '../../src/download/retry/is-retryable-error';
import {
  NetworkError,
  TimeoutError,
  HttpStatusError,
  AbortDownloadError,
  InvalidBlobResponseError,
} from '../../src/download/errors/download-errors';

describe('isRetryableError()', () => {
  it('NetworkError -> true', () => {
    expect(isRetryableError(new NetworkError())).toBe(true);
  });

  it('TimeoutError -> true', () => {
    expect(isRetryableError(new TimeoutError(5000))).toBe(true);
  });

  it('HttpStatusError(500) -> true', () => {
    expect(isRetryableError(new HttpStatusError(500, 'Internal Server Error'))).toBe(true);
  });

  it('HttpStatusError(502) -> true', () => {
    expect(isRetryableError(new HttpStatusError(502, 'Bad Gateway'))).toBe(true);
  });

  it('HttpStatusError(503) -> true', () => {
    expect(isRetryableError(new HttpStatusError(503, 'Service Unavailable'))).toBe(true);
  });

  it('HttpStatusError(504) -> true', () => {
    expect(isRetryableError(new HttpStatusError(504, 'Gateway Timeout'))).toBe(true);
  });

  it('HttpStatusError(408) -> true', () => {
    expect(isRetryableError(new HttpStatusError(408, 'Request Timeout'))).toBe(true);
  });

  it('HttpStatusError(429) -> true', () => {
    expect(isRetryableError(new HttpStatusError(429, 'Too Many Requests'))).toBe(true);
  });

  it('HttpStatusError(404) -> false', () => {
    expect(isRetryableError(new HttpStatusError(404, 'Not Found'))).toBe(false);
  });

  it('HttpStatusError(401) -> false', () => {
    expect(isRetryableError(new HttpStatusError(401, 'Unauthorized'))).toBe(false);
  });

  it('AbortDownloadError -> false', () => {
    expect(isRetryableError(new AbortDownloadError())).toBe(false);
  });

  it('InvalidBlobResponseError -> false', () => {
    expect(isRetryableError(new InvalidBlobResponseError())).toBe(false);
  });

  it('HttpStatusError(403) -> false', () => {
    expect(isRetryableError(new HttpStatusError(403, 'Forbidden'))).toBe(false);
  });

  it('HttpStatusError(400) -> false', () => {
    expect(isRetryableError(new HttpStatusError(400, 'Bad Request'))).toBe(false);
  });
});

describe('parseRetryAfterMs()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses numeric delta-seconds "120" -> 120000ms', () => {
    expect(parseRetryAfterMs('120')).toBe(120_000);
  });

  it('parses "0" -> 0ms', () => {
    expect(parseRetryAfterMs('0')).toBe(0);
  });

  it('parses HTTP-date string -> positive ms (future date)', () => {
    // Use a fixed future date that is always in the future
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));

    const futureDate = 'Wed, 01 Jan 2020 00:02:00 GMT'; // 2 minutes in future
    const result = parseRetryAfterMs(futureDate);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(300_000);
  });

  it('returns null for null input', () => {
    expect(parseRetryAfterMs(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseRetryAfterMs(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseRetryAfterMs('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseRetryAfterMs('   ')).toBeNull();
  });

  it('returns null for unparseable string', () => {
    expect(parseRetryAfterMs('banana')).toBeNull();
  });

  it('caps "999999" delta-seconds at 300000ms (5 minutes)', () => {
    expect(parseRetryAfterMs('999999')).toBe(300_000);
  });

  it('caps very large delta-seconds at 300000ms', () => {
    expect(parseRetryAfterMs('86400')).toBe(300_000); // 1 day → capped
  });

  it('returns null for past HTTP-date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const pastDate = 'Wed, 21 Oct 2015 07:28:00 GMT'; // Far in past
    expect(parseRetryAfterMs(pastDate)).toBeNull();
  });

  it('caps HTTP-date delay at 300000ms', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));

    // 1 hour in future = 3600000ms, capped at 300000ms
    const farFutureDate = 'Wed, 01 Jan 2020 01:00:00 GMT';
    expect(parseRetryAfterMs(farFutureDate)).toBe(300_000);
  });
});
