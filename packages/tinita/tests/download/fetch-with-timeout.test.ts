// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../../src/download/browser/fetch-with-timeout';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors/download-errors';

describe('fetchWithTimeout', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns Response on successful fetch', async () => {
    const mockResponse = new Response('data', { status: 200 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithTimeout('https://example.com/file.pdf');
    expect(result).toBe(mockResponse);
  });

  it('throws FETCH_FAILED for non-OK HTTP status', async () => {
    const mockResponse = new Response('Not Found', { status: 404, statusText: 'Not Found' });
    mockFetch.mockResolvedValueOnce(mockResponse);

    await expect(fetchWithTimeout('https://example.com/missing')).rejects.toMatchObject({
      code: DownloadErrorCode.FETCH_FAILED,
    });
  });

  it('throws FETCH_TIMEOUT when request exceeds timeout', async () => {
    vi.useFakeTimers();

    mockFetch.mockImplementation((_url: string, { signal }: RequestInit) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const fetchPromise = fetchWithTimeout('https://example.com/slow', { timeout: 1000 });
    vi.advanceTimersByTime(1001);

    await expect(fetchPromise).rejects.toMatchObject({
      code: DownloadErrorCode.FETCH_TIMEOUT,
    });
  });

  it('throws FETCH_ABORTED when external signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithTimeout('https://example.com/file', { signal: controller.signal })
    ).rejects.toMatchObject({
      code: DownloadErrorCode.FETCH_ABORTED,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws FETCH_ABORTED when external signal aborts mid-request', async () => {
    const controller = new AbortController();

    mockFetch.mockImplementation((_url: string, { signal }: RequestInit) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const fetchPromise = fetchWithTimeout('https://example.com/file', {
      signal: controller.signal,
      timeout: 30_000,
    });
    controller.abort();

    await expect(fetchPromise).rejects.toMatchObject({
      code: DownloadErrorCode.FETCH_ABORTED,
    });
  });

  it('wraps generic network error as FETCH_FAILED', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(fetchWithTimeout('https://example.com/file')).rejects.toMatchObject({
      code: DownloadErrorCode.FETCH_FAILED,
    });
  });

  it('passes fetchOptions to fetch()', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    await fetchWithTimeout('https://example.com/api', {
      fetchOptions: { method: 'POST', headers: { Authorization: 'Bearer token' } },
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer token');
  });

  it('always clears timeout on success', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    await fetchWithTimeout('https://example.com/file', { timeout: 5000 });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
