import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitMinDuration } from '../../src/download/retry/min-duration-delay';
import { AbortDownloadError } from '../../src/download/errors/download-errors';

describe('waitMinDuration()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when elapsed time exceeds minDuration', async () => {
    const startTime = Date.now() - 2000; // 2 seconds ago
    const minDuration = 1000; // only 1 second needed

    const promise = waitMinDuration(startTime, minDuration);
    // No timer advance needed — remaining <= 0 resolves synchronously
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves immediately when elapsed time exactly equals minDuration', async () => {
    const startTime = Date.now() - 500;
    const minDuration = 500;

    const promise = waitMinDuration(startTime, minDuration);
    await expect(promise).resolves.toBeUndefined();
  });

  it('waits the remaining time when elapsed < minDuration', async () => {
    const startTime = Date.now() - 200; // 200ms elapsed
    const minDuration = 1000; // needs 800ms more

    let resolved = false;
    const promise = waitMinDuration(startTime, minDuration).then(() => {
      resolved = true;
    });

    // Not resolved yet
    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);

    // Advance past the remaining time (~800ms total from start)
    await vi.advanceTimersByTimeAsync(400);
    await promise;
    expect(resolved).toBe(true);
  });

  it('resolves immediately when minDuration is 0', async () => {
    const startTime = Date.now();
    const promise = waitMinDuration(startTime, 0);
    // remaining = 0 - 0 = 0, resolves immediately
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects with AbortDownloadError when shouldAbort returns true during wait', async () => {
    const startTime = Date.now();
    const minDuration = 2000;
    let aborted = false;

    const promise = waitMinDuration(startTime, minDuration, () => aborted);
    // Attach catch immediately to avoid unhandled rejection
    const caught = promise.catch((e) => e);

    // Trigger abort
    aborted = true;
    // Advance time to trigger the abort polling interval
    await vi.advanceTimersByTimeAsync(100);

    const err = await caught;
    expect(err).toBeInstanceOf(AbortDownloadError);
  });

  it('rejects with AbortDownloadError when shouldAbort is true at timeout fire', async () => {
    const startTime = Date.now() - 900;
    const minDuration = 1000; // 100ms remaining
    let aborted = false;

    const promise = waitMinDuration(startTime, minDuration, () => aborted);
    // Attach catch immediately to avoid unhandled rejection
    const caught = promise.catch((e) => e);

    // Set abort just before the timer fires
    aborted = true;
    await vi.advanceTimersByTimeAsync(200);

    const err = await caught;
    expect(err).toBeInstanceOf(AbortDownloadError);
  });

  it('resolves without shouldAbort when no abort function provided', async () => {
    const startTime = Date.now();
    const minDuration = 500;

    const promise = waitMinDuration(startTime, minDuration);
    await vi.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves when shouldAbort never returns true', async () => {
    const startTime = Date.now();
    const minDuration = 300;

    const promise = waitMinDuration(startTime, minDuration, () => false);
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).resolves.toBeUndefined();
  });
});
