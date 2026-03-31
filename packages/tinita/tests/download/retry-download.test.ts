import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveRetryConfig,
  calculateRetryDelay,
  withRetry,
} from '../../src/download/retry/retry-download';
import {
  NetworkError,
  HttpStatusError,
  AbortDownloadError,
} from '../../src/download/errors/download-errors';
import {
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_JITTER_FACTOR,
} from '../../src/download/core/constants';

// ── resolveRetryConfig ────────────────────────────────────────────────────────

describe('resolveRetryConfig()', () => {
  it('returns null for undefined', () => {
    expect(resolveRetryConfig(undefined)).toBeNull();
  });

  it('returns null for false', () => {
    expect(resolveRetryConfig(false)).toBeNull();
  });

  it('converts number to { maxRetries: n }', () => {
    expect(resolveRetryConfig(3)).toEqual({ maxRetries: 3 });
  });

  it('returns the RetryOptions object as-is', () => {
    const opts = { maxRetries: 5, delay: 2000 };
    expect(resolveRetryConfig(opts)).toEqual(opts);
  });

  it('returns the RetryOptions object with custom retryOn', () => {
    const retryOn = vi.fn();
    const opts = { maxRetries: 2, retryOn };
    expect(resolveRetryConfig(opts)).toBe(opts);
  });
});

// ── calculateRetryDelay ───────────────────────────────────────────────────────

describe('calculateRetryDelay()', () => {
  it('attempt=0 returns ~1000ms (+/- jitter)', () => {
    const delay = calculateRetryDelay(0);
    const base = RETRY_BASE_DELAY_MS; // 1000
    const low = Math.round(base * (1 - RETRY_JITTER_FACTOR));
    const high = Math.round(base * (1 + RETRY_JITTER_FACTOR));
    expect(delay).toBeGreaterThanOrEqual(low);
    expect(delay).toBeLessThanOrEqual(high);
  });

  it('attempt=1 returns ~2000ms (+/- jitter)', () => {
    const delay = calculateRetryDelay(1);
    const base = Math.min(RETRY_BASE_DELAY_MS * 2, RETRY_MAX_DELAY_MS); // 2000
    const low = Math.round(base * (1 - RETRY_JITTER_FACTOR));
    const high = Math.round(base * (1 + RETRY_JITTER_FACTOR));
    expect(delay).toBeGreaterThanOrEqual(low);
    expect(delay).toBeLessThanOrEqual(high);
  });

  it('attempt=10 is capped at RETRY_MAX_DELAY_MS (30000ms) +/- jitter', () => {
    const delay = calculateRetryDelay(10);
    const cap = RETRY_MAX_DELAY_MS; // 30000
    const low = Math.round(cap * (1 - RETRY_JITTER_FACTOR));
    const high = Math.round(cap * (1 + RETRY_JITTER_FACTOR));
    expect(delay).toBeGreaterThanOrEqual(low);
    expect(delay).toBeLessThanOrEqual(high);
  });

  it('uses fixed delay from options.delay (number)', () => {
    const delay = calculateRetryDelay(0, { delay: 5000 });
    expect(delay).toBe(5000);
  });

  it('calls options.delay function with the attempt index', () => {
    const delayFn = vi.fn((attempt: number) => attempt * 1000);
    const delay = calculateRetryDelay(3, { delay: delayFn });
    expect(delayFn).toHaveBeenCalledWith(3);
    expect(delay).toBe(3000);
  });
});

// ── withRetry ─────────────────────────────────────────────────────────────────

describe('withRetry()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('succeeds on first try: fn called once', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const promise = withRetry(fn, { maxRetries: 3, delay: 0 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(0);
  });

  it('retries on retryable error and succeeds on second attempt', async () => {
    const networkErr = new NetworkError();
    const fn = vi.fn()
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValue('success');

    const promise = withRetry(fn, { maxRetries: 3, delay: 10 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries maxRetries times then rejects with the last error', async () => {
    const networkErr = new NetworkError();
    const fn = vi.fn().mockRejectedValue(networkErr);

    const promise = withRetry(fn, { maxRetries: 3, delay: 10 });
    // Attach catch early to avoid unhandled rejection
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBe(networkErr);
    // Called: attempt 0, retry 1, retry 2, retry 3 = 4 total
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('stops immediately on non-retryable error: fn called once', async () => {
    const abortErr = new AbortDownloadError();
    const fn = vi.fn().mockRejectedValue(abortErr);

    const promise = withRetry(fn, { maxRetries: 3, delay: 10 });
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBe(abortErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops when shouldAbort() returns true', async () => {
    const networkErr = new NetworkError();
    const fn = vi.fn().mockRejectedValue(networkErr);
    let aborted = false;

    const promise = withRetry(
      fn,
      { maxRetries: 3, delay: 100 },
      { shouldAbort: () => aborted },
    );
    const caught = promise.catch((e) => e);

    // Set abort flag before any timer fires
    aborted = true;
    await vi.runAllTimersAsync();

    const err = await caught;
    expect(err).toBe(networkErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback with error and attempt number per retry', async () => {
    const networkErr = new NetworkError();
    const fn = vi.fn()
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValue('ok');
    const onRetry = vi.fn();

    const promise = withRetry(fn, { maxRetries: 3, delay: 10 }, { onRetry });
    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, networkErr, 0);
    expect(onRetry).toHaveBeenNthCalledWith(2, networkErr, 1);
  });

  it('uses custom retryOn predicate', async () => {
    const err404 = new HttpStatusError(404, 'Not Found');
    // By default 404 is NOT retryable, but custom predicate can change that
    const fn = vi.fn()
      .mockRejectedValueOnce(err404)
      .mockResolvedValue('ok');
    const retryOn = vi.fn().mockReturnValue(true); // always retry

    const promise = withRetry(fn, { maxRetries: 3, delay: 10, retryOn });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(retryOn).toHaveBeenCalledWith(err404, 0);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('custom retryOn returning false stops retries', async () => {
    const networkErr = new NetworkError();
    const fn = vi.fn().mockRejectedValue(networkErr);
    const retryOn = vi.fn().mockReturnValue(false); // never retry

    const promise = withRetry(fn, { maxRetries: 3, delay: 10, retryOn });
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBe(networkErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses retryAfterMs from HttpStatusError when available', async () => {
    const err429 = new HttpStatusError(429, 'Too Many Requests', 5000);
    const fn = vi.fn()
      .mockRejectedValueOnce(err429)
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxRetries: 3, delay: 0 });

    // Advance 4999ms — should still be waiting
    await vi.advanceTimersByTimeAsync(4999);
    expect(fn).toHaveBeenCalledTimes(1);

    // Advance past the retryAfterMs
    await vi.advanceTimersByTimeAsync(100);
    await promise;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
