// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock tinita/download ──────────────────────────────────────────────────────

vi.mock('tinita/download', () => {
  class AbortDownloadError extends Error {
    code = 'DOWNLOAD_ABORTED';
    constructor() {
      super('Download was aborted');
      this.name = 'AbortDownloadError';
    }
  }
  return {
    downloadFromUrl: vi.fn(),
    AbortDownloadError,
  };
});

import { useUrlDownload } from '../../src/hooks/use-url-download';

// ── Local type definitions ───────────────────────────────────────────────────

interface DownloadResult {
  success: boolean;
  filename: string;
  blob: Blob;
  size: number;
  mimeType: string;
  clicked: boolean;
  revoked: boolean;
  cleanup: () => void;
}

interface DownloadProgress {
  loaded: number;
  total: number | null;
  percent: number | null;
  lengthComputable: boolean;
  speedBps: number | null;
  etaMs: number | null;
}

interface DownloadFromUrlOptions {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  timeout?: number;
  filename?: string;
  onStart?: () => void;
  onProgress?: (progress: DownloadProgress) => void;
  onSuccess?: (result: DownloadResult) => void;
  onError?: (error: Error) => void;
  onAbort?: () => void;
}

interface MockTaskHandle {
  task: {
    promise: Promise<DownloadResult>;
    abort: ReturnType<typeof vi.fn>;
    xhr: object;
  };
  hookedOptions: DownloadFromUrlOptions;
  resolvePromise: (v: DownloadResult) => void;
  rejectPromise: (e: Error) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockTask(hookedOptions: DownloadFromUrlOptions): MockTaskHandle {
  let resolvePromise!: (v: DownloadResult) => void;
  let rejectPromise!: (e: Error) => void;
  const promise = new Promise<DownloadResult>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });
  const abort = vi.fn();
  const task = { promise, abort, xhr: {} };
  return { task, hookedOptions, resolvePromise, rejectPromise };
}

function makeResult(overrides: Partial<DownloadResult> = {}): DownloadResult {
  return {
    success: true,
    filename: 'file.zip',
    blob: new Blob(['data']),
    size: 4,
    mimeType: 'application/octet-stream',
    clicked: true,
    revoked: false,
    cleanup: vi.fn(),
    ...overrides,
  };
}

async function getMockFn() {
  const mod = await import('tinita/download');
  return mod.downloadFromUrl as ReturnType<typeof vi.fn>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useUrlDownload (useMutation pattern)', () => {
  let mockDownloadFromUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockDownloadFromUrl = await getMockFn();
    mockDownloadFromUrl.mockReset();
  });

  // 1. Initial state
  it('has correct initial state', () => {
    const { result } = renderHook(() => useUrlDownload());

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  // 2. mutate() triggers download
  it('mutate() calls downloadFromUrl and transitions to starting', () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    expect(mockDownloadFromUrl).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('starting');
    expect(result.current.isPending).toBe(true);
    expect(result.current.isIdle).toBe(false);
  });

  // 3. Progress updates
  it('updates progress state via onProgress callback', () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    const progressEvent: DownloadProgress = {
      loaded: 500, total: 1000, percent: 50,
      lengthComputable: true, speedBps: 200, etaMs: 2500,
    };

    act(() => {
      handle.hookedOptions.onProgress?.(progressEvent);
    });

    expect(result.current.progress).toEqual(progressEvent);
    expect(result.current.status).toBe('downloading');
    expect(result.current.isPending).toBe(true);
  });

  // 4. Successful download — data populated
  it('sets isSuccess and populates data on completion', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    const downloadResult = makeResult();
    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(downloadResult);
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  // 5. Failed download — error populated
  it('sets isError and populates error on failure', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    const err = new Error('Network error');
    await act(async () => {
      handle.hookedOptions.onError?.(err);
      handle.rejectPromise(err);
      await handle.task.promise.catch(() => {});
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(err);
    expect(result.current.data).toBeNull();
  });

  // 6. mutateAsync returns promise
  it('mutateAsync() returns promise that resolves with DownloadResult', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    let asyncResult: DownloadResult | undefined;
    const downloadResult = makeResult();

    await act(async () => {
      const promise = result.current.mutateAsync('https://example.com/file.zip');
      // Simulate success
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      asyncResult = await promise;
    });

    expect(asyncResult).toEqual(downloadResult);
    expect(result.current.isSuccess).toBe(true);
  });

  // 7. mutateAsync rejects on error
  it('mutateAsync() rejects on download failure', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    const err = new Error('HTTP 500');
    let caughtError: Error | undefined;

    await act(async () => {
      const promise = result.current.mutateAsync('https://example.com/file.zip');
      // Catch the underlying task promise to prevent unhandled rejection
      handle.task.promise.catch(() => {});
      handle.hookedOptions.onError?.(err);
      handle.rejectPromise(err);
      try {
        await promise;
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect(caughtError?.message).toBe('HTTP 500');
    expect(result.current.isError).toBe(true);
  });

  // 8. Hook-level callbacks fire
  it('hook-level onSuccess/onError/onSettled fire correctly', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const hookOnSuccess = vi.fn();
    const hookOnSettled = vi.fn();

    const { result } = renderHook(() => useUrlDownload({
      onSuccess: hookOnSuccess,
      onSettled: hookOnSettled,
    }));

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    const downloadResult = makeResult();
    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    expect(hookOnSuccess).toHaveBeenCalledWith(downloadResult);
    expect(hookOnSettled).toHaveBeenCalledWith(downloadResult, null);
  });

  // 9. Per-call callbacks fire alongside hook-level
  it('per-call onSuccess fires alongside hook-level onSuccess', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const hookOnSuccess = vi.fn();
    const callOnSuccess = vi.fn();

    const { result } = renderHook(() => useUrlDownload({ onSuccess: hookOnSuccess }));

    act(() => {
      result.current.mutate('https://example.com/file.zip', { onSuccess: callOnSuccess });
    });

    const downloadResult = makeResult();
    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    expect(hookOnSuccess).toHaveBeenCalledWith(downloadResult);
    expect(callOnSuccess).toHaveBeenCalledWith(downloadResult);
  });

  // 10. Options merge: hook-level < per-call
  it('per-call options override hook-level options', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      return createMockTask(opts).task;
    });

    const { result } = renderHook(() => useUrlDownload({
      headers: { Authorization: 'Bearer default' },
      timeout: 15_000,
      filename: 'default.csv',
    }));

    act(() => {
      result.current.mutate('https://example.com/export', {
        filename: 'custom.csv',
      });
    });

    const [, calledOpts] = mockDownloadFromUrl.mock.calls[0] as [string, DownloadFromUrlOptions];
    expect(calledOpts.headers).toEqual({ Authorization: 'Bearer default' });
    expect(calledOpts.timeout).toBe(15_000);
    expect(calledOpts.filename).toBe('custom.csv');
  });

  // 11. abort()
  it('abort() calls task.abort() and transitions to aborted', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    await act(async () => {
      result.current.abort();
      // The hook's onAbort wrapper dispatches ABORTED state
      handle.hookedOptions.onAbort?.();
      handle.rejectPromise(new Error('aborted'));
      await handle.task.promise.catch(() => {});
      // Wait for the wrapper promise's catch to settle
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(handle.task.abort).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('aborted');
  });

  // 12. reset()
  it('reset() returns to idle state', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    const downloadResult = makeResult();
    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBeNull();
  });

  // 13. mutate() aborts previous
  it('mutate() aborts the previous active task', () => {
    let firstHandle!: MockTaskHandle;
    let callCount = 0;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      if (callCount === 0) firstHandle = h;
      callCount++;
      return h.task;
    });

    const { result } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file1.zip');
    });
    act(() => {
      result.current.mutate('https://example.com/file2.zip');
    });

    expect(firstHandle.task.abort).toHaveBeenCalledTimes(1);
    expect(mockDownloadFromUrl).toHaveBeenCalledTimes(2);
  });

  // 14. Cleanup on unmount
  it('aborts active task on unmount', () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result, unmount } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    unmount();
    expect(handle.task.abort).toHaveBeenCalledTimes(1);
  });

  // 15. No dispatch after unmount
  it('does not throw when promise resolves after unmount', async () => {
    let handle!: MockTaskHandle;
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result, unmount } = renderHook(() => useUrlDownload());

    act(() => {
      result.current.mutate('https://example.com/file.zip');
    });

    unmount();

    await expect(async () => {
      handle.resolvePromise(makeResult());
      await handle.task.promise.catch(() => {});
    }).not.toThrow();
  });
});
