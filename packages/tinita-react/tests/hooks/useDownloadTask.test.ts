// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock tinita/download ──────────────────────────────────────────────────────
// Factory pattern prevents Vite from resolving the actual module path.
// All types are defined locally to avoid import-time resolution failures.

vi.mock('tinita/download', () => {
  const downloadFromUrl = vi.fn();
  return { downloadFromUrl };
});

import { useDownloadTask } from '../../src/hooks/use-download-task';

// ── Local type definitions (mirrors tinita/download types) ────────────────────

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
  /** The fake DownloadTask returned to the hook */
  task: {
    promise: Promise<DownloadResult>;
    abort: ReturnType<typeof vi.fn>;
    xhr: object;
  };
  /** The options the hook passed into downloadFromUrl (contains hook's wrapped callbacks) */
  hookedOptions: DownloadFromUrlOptions;
  resolvePromise: (v: DownloadResult) => void;
  rejectPromise: (e: Error) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// Helper to get the mock fn from the mocked module
async function getMockFn() {
  const mod = await import('tinita/download');
  return mod.downloadFromUrl as ReturnType<typeof vi.fn>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDownloadTask', () => {
  let mockDownloadFromUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockDownloadFromUrl = await getMockFn();
    mockDownloadFromUrl.mockReset();
  });

  // 1. Initial state
  it('has correct initial state', () => {
    const { result } = renderHook(() => useDownloadTask());

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  // 2. start() calls downloadFromUrl and transitions status to 'starting'
  it('start() calls downloadFromUrl and transitions to starting', () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    expect(mockDownloadFromUrl).toHaveBeenCalledTimes(1);
    expect(mockDownloadFromUrl.mock.calls[0]![0]).toBe('https://example.com/file.zip');
    expect(result.current.status).toBe('starting');
    expect(result.current.isDownloading).toBe(true);
  });

  // 3. Progress updates via hook's internal onProgress callback
  it('updates progress state when onProgress callback is invoked', () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    const progressEvent: DownloadProgress = {
      loaded: 500,
      total: 1000,
      percent: 50,
      lengthComputable: true,
      speedBps: 200,
      etaMs: 2500,
    };

    act(() => {
      handle.hookedOptions.onProgress?.(progressEvent);
    });

    expect(result.current.progress).toEqual(progressEvent);
    expect(result.current.status).toBe('downloading');
  });

  // 4. Successful download
  it('sets status to completed and populates result on success', async () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    const downloadResult = makeResult();

    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.result).toEqual(downloadResult);
    expect(result.current.error).toBeNull();
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.isDownloading).toBe(false);
  });

  // 5. Failed download
  it('sets status to failed and populates error on rejection', async () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    const err = new Error('Network error');

    await act(async () => {
      handle.hookedOptions.onError?.(err);
      handle.rejectPromise(err);
      await handle.task.promise.catch(() => {});
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.error).toBe(err);
    expect(result.current.result).toBeNull();
    expect(result.current.isDownloading).toBe(false);
  });

  // 6. abort() calls task.abort() and transitions to aborted
  it('abort() calls task.abort() and transitions to aborted', async () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    await act(async () => {
      result.current.abort();
      handle.hookedOptions.onAbort?.();
      handle.rejectPromise(new Error('aborted'));
      await handle.task.promise.catch(() => {});
    });

    expect(handle.task.abort).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('aborted');
    expect(result.current.isDownloading).toBe(false);
  });

  // 7. reset() returns to initial state
  it('reset() returns hook to initial idle state after completion', async () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    const downloadResult = makeResult();

    await act(async () => {
      handle.hookedOptions.onSuccess?.(downloadResult);
      handle.resolvePromise(downloadResult);
      await handle.task.promise.catch(() => {});
    });

    expect(result.current.status).toBe('completed');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });

  // 8. start() aborts previous in-flight task
  it('start() aborts the previous active task before starting a new one', () => {
    let firstHandle!: MockTaskHandle;
    let callCount = 0;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      if (callCount === 0) firstHandle = h;
      callCount++;
      return h.task;
    });

    const { result } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file1.zip');
    });

    act(() => {
      result.current.start('https://example.com/file2.zip');
    });

    expect(firstHandle.task.abort).toHaveBeenCalledTimes(1);
    expect(mockDownloadFromUrl).toHaveBeenCalledTimes(2);
  });

  // 9. Cleanup on unmount aborts active task
  it('aborts active task when component unmounts', () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result, unmount } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    unmount();

    expect(handle.task.abort).toHaveBeenCalledTimes(1);
  });

  // 10. No state dispatch after unmount — resolving promise must not throw
  it('does not throw when promise resolves after unmount', async () => {
    let handle!: MockTaskHandle;

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      handle = createMockTask(opts);
      return handle.task;
    });

    const { result, unmount } = renderHook(() => useDownloadTask());

    act(() => {
      result.current.start('https://example.com/file.zip');
    });

    unmount();

    // Resolving after unmount should not throw or cause React warnings
    await expect(async () => {
      handle.resolvePromise(makeResult());
      await handle.task.promise.catch(() => {});
    }).not.toThrow();
  });

  // 11. defaultOptions merged with per-call options
  it('merges defaultOptions with per-call options', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      return createMockTask(opts).task;
    });

    const defaultOptions = {
      headers: { Authorization: 'Bearer token' },
      timeout: 15_000,
    };

    const { result } = renderHook(() => useDownloadTask(defaultOptions));

    act(() => {
      result.current.start('https://example.com/file.zip', { filename: 'custom.zip' });
    });

    const [, calledOpts] = mockDownloadFromUrl.mock.calls[0] as [string, DownloadFromUrlOptions];
    expect(calledOpts.headers).toEqual({ Authorization: 'Bearer token' });
    expect(calledOpts.timeout).toBe(15_000);
    expect(calledOpts.filename).toBe('custom.zip');
  });
});
