// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock tinita/download ──────────────────────────────────────────────────────

vi.mock('tinita/download', () => ({
  downloadFromUrl: vi.fn(),
}));

import { useDownloadQueue } from '../../src/hooks/use-download-queue';
import type { QueueItem } from '../../src/hooks/use-download-queue';

// ── Local type mirrors ────────────────────────────────────────────────────────

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
  onProgress?: (progress: DownloadProgress) => void;
  onSuccess?: (result: DownloadResult) => void;
  onError?: (error: Error) => void;
  onAbort?: () => void;
  [key: string]: unknown;
}

interface MockTaskHandle {
  task: {
    promise: Promise<DownloadResult>;
    abort: ReturnType<typeof vi.fn>;
    xhr: object;
  };
  capturedOptions: DownloadFromUrlOptions;
  resolve: (v: DownloadResult) => void;
  reject: (e: Error) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function createMockTask(opts: DownloadFromUrlOptions): MockTaskHandle {
  let resolve!: (v: DownloadResult) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<DownloadResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const abort = vi.fn(() => {
    opts.onAbort?.();
  });
  const task = { promise, abort, xhr: {} };
  return { task, capturedOptions: opts, resolve, reject };
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

async function getMockDownloadFn() {
  const mod = await import('tinita/download');
  return mod.downloadFromUrl as ReturnType<typeof vi.fn>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDownloadQueue()', () => {
  let mockDownloadFromUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockDownloadFromUrl = await getMockDownloadFn();
    mockDownloadFromUrl.mockReset();
  });

  // 1. Initial state
  it('initial state is idle with empty items', () => {
    const { result } = renderHook(() => useDownloadQueue());

    expect(result.current.items).toHaveLength(0);
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.progress).toEqual({ loaded: 0, total: null, percent: null });
  });

  // 2. add(url) creates pending item
  it('add(url) creates a pending item', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) =>
      createMockTask(opts).task,
    );

    const { result } = renderHook(() => useDownloadQueue({ autoStart: false }));

    act(() => {
      result.current.add('https://example.com/file.zip');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.status).toBe('pending');
    expect(result.current.items[0]!.url).toBe('https://example.com/file.zip');
    expect(result.current.pendingCount).toBe(1);
  });

  // 3. add([url1, url2]) batch adds
  it('add([url1, url2]) batch adds two items', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) =>
      createMockTask(opts).task,
    );

    const { result } = renderHook(() => useDownloadQueue({ autoStart: false }));

    act(() => {
      result.current.add([
        'https://example.com/a.zip',
        'https://example.com/b.zip',
      ]);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.pendingCount).toBe(2);
  });

  // 4. add() returns assigned IDs
  it('add() returns the assigned IDs', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) =>
      createMockTask(opts).task,
    );

    const { result } = renderHook(() => useDownloadQueue({ autoStart: false }));

    let ids: string[] = [];
    act(() => {
      ids = result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    expect(ids).toHaveLength(2);
    expect(typeof ids[0]).toBe('string');
    expect(typeof ids[1]).toBe('string');
  });

  // 5. autoStart starts downloads up to concurrency
  it('autoStart=true starts downloads immediately up to concurrency', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    act(() => {
      result.current.add([
        'https://example.com/a.zip',
        'https://example.com/b.zip',
        'https://example.com/c.zip',
      ]);
    });

    // After state updates settle, should have 2 active and 1 pending
    await act(async () => {});

    expect(result.current.activeCount).toBe(2);
    expect(result.current.pendingCount).toBe(1);
  });

  // 6. pause() stops new downloads from starting
  it('pause() stops new downloads from starting', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 3, autoStart: true }),
    );

    act(() => {
      result.current.pause();
    });

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    expect(result.current.isPaused).toBe(true);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.pendingCount).toBe(2);
  });

  // 7. resume() restarts queue
  it('resume() restarts queue processing', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 3, autoStart: true }),
    );

    // Pause first
    act(() => {
      result.current.pause();
    });

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    expect(result.current.pendingCount).toBe(2);

    // Resume
    act(() => {
      result.current.resume();
    });

    await act(async () => {});

    expect(result.current.isPaused).toBe(false);
    expect(result.current.activeCount).toBeGreaterThan(0);
  });

  // 8. abort(id) aborts a specific item
  it('abort(id) aborts a specific active download', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    let ids: string[] = [];
    act(() => {
      ids = result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    expect(result.current.activeCount).toBe(2);

    // Abort the first item
    act(() => {
      result.current.abort(ids[0]!);
    });

    await act(async () => {});

    const abortedItem = result.current.items.find((i) => i.id === ids[0]);
    expect(abortedItem?.status).toBe('aborted');
  });

  // 9. abortAll() aborts all active and marks pending as aborted
  it('abortAll() aborts all active and marks pending as aborted', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    act(() => {
      result.current.abortAll();
    });

    await act(async () => {});

    const allSettled = result.current.items.every((i) =>
      i.status === 'aborted' || i.status === 'completed' || i.status === 'failed',
    );
    expect(allSettled).toBe(true);
  });

  // 10. clear() removes settled items
  it('clear() removes completed, failed, and aborted items', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    // Complete the first download
    await act(async () => {
      handles[0]!.capturedOptions.onSuccess?.(makeResult());
      handles[0]!.resolve(makeResult());
    });

    // Fail the second download
    await act(async () => {
      handles[1]!.capturedOptions.onError?.(new Error('Network error'));
      handles[1]!.reject(new Error('Network error'));
      await handles[1]!.task.promise.catch(() => {});
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toHaveLength(0);
  });

  // 11. retry(id) requeues a failed item
  it('retry(id) requeues a failed item back to pending', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true }),
    );

    let ids: string[] = [];
    act(() => {
      ids = result.current.add('https://example.com/file.zip');
    });

    await act(async () => {});

    // Fail the download
    await act(async () => {
      handles[0]!.capturedOptions.onError?.(new Error('Network error'));
      handles[0]!.reject(new Error('Network error'));
      await handles[0]!.task.promise.catch(() => {});
    });

    expect(result.current.items.find((i) => i.id === ids[0])?.status).toBe('failed');

    // Pause to prevent immediate restart
    act(() => {
      result.current.pause();
    });

    // Retry
    act(() => {
      result.current.retry(ids[0]!);
    });

    await act(async () => {});

    const item = result.current.items.find((i) => i.id === ids[0]);
    expect(item?.status).toBe('pending');
  });

  // 12. remove(id) removes a pending item
  it('remove(id) removes a pending item', () => {
    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) =>
      createMockTask(opts).task,
    );

    const { result } = renderHook(() => useDownloadQueue({ autoStart: false }));

    let ids: string[] = [];
    act(() => {
      ids = result.current.add('https://example.com/file.zip');
    });

    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.remove(ids[0]!);
    });

    expect(result.current.items).toHaveLength(0);
  });

  // 13. onItemSuccess fires per item
  it('onItemSuccess fires when an item completes', async () => {
    const handles: MockTaskHandle[] = [];
    const onItemSuccess = vi.fn();

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true, onItemSuccess }),
    );

    act(() => {
      result.current.add('https://example.com/file.zip');
    });

    await act(async () => {});

    const res = makeResult();
    await act(async () => {
      handles[0]!.capturedOptions.onSuccess?.(res);
      handles[0]!.resolve(res);
    });

    expect(onItemSuccess).toHaveBeenCalledTimes(1);
    const calledItem = onItemSuccess.mock.calls[0]![0] as QueueItem;
    expect(calledItem.status).toBe('completed');
  });

  // 14. onItemError fires per item
  it('onItemError fires when an item fails', async () => {
    const handles: MockTaskHandle[] = [];
    const onItemError = vi.fn();

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true, onItemError }),
    );

    act(() => {
      result.current.add('https://example.com/file.zip');
    });

    await act(async () => {});

    await act(async () => {
      const err = new Error('Download failed');
      handles[0]!.capturedOptions.onError?.(err);
      handles[0]!.reject(err);
      await handles[0]!.task.promise.catch(() => {});
    });

    expect(onItemError).toHaveBeenCalledTimes(1);
    const calledItem = onItemError.mock.calls[0]![0] as QueueItem;
    expect(calledItem.status).toBe('failed');
  });

  // 15. onAllSettled fires when all items are done
  it('onAllSettled fires when all items have settled', async () => {
    const handles: MockTaskHandle[] = [];
    const onAllSettled = vi.fn();

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true, onAllSettled }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    // Complete both downloads
    const res1 = makeResult({ filename: 'a.zip' });
    const res2 = makeResult({ filename: 'b.zip' });

    await act(async () => {
      handles[0]!.capturedOptions.onSuccess?.(res1);
      handles[0]!.resolve(res1);
    });

    await act(async () => {
      handles[1]!.capturedOptions.onSuccess?.(res2);
      handles[1]!.resolve(res2);
    });

    expect(onAllSettled).toHaveBeenCalledTimes(1);
    const settledItems = onAllSettled.mock.calls[0]![0] as QueueItem[];
    expect(settledItems.every((i) => i.status === 'completed')).toBe(true);
  });

  // 16. Aggregate progress computed correctly
  it('aggregate progress is computed correctly across active downloads', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    // Simulate progress for both active items
    const progress1: DownloadProgress = {
      loaded: 500, total: 1000, percent: 50,
      lengthComputable: true, speedBps: null, etaMs: null,
    };
    const progress2: DownloadProgress = {
      loaded: 300, total: 1000, percent: 30,
      lengthComputable: true, speedBps: null, etaMs: null,
    };

    act(() => {
      handles[0]!.capturedOptions.onProgress?.(progress1);
    });

    act(() => {
      handles[1]!.capturedOptions.onProgress?.(progress2);
    });

    expect(result.current.progress.loaded).toBe(800);
    expect(result.current.progress.total).toBe(2000);
    expect(result.current.progress.percent).toBe(40);
  });

  // 17. Aggregate progress null when total unknown
  it('aggregate progress.total is null when any active item has unknown total', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    // First item has known total, second does not
    act(() => {
      handles[0]!.capturedOptions.onProgress?.({
        loaded: 500, total: 1000, percent: 50,
        lengthComputable: true, speedBps: null, etaMs: null,
      });
    });

    act(() => {
      handles[1]!.capturedOptions.onProgress?.({
        loaded: 300, total: null, percent: null,
        lengthComputable: false, speedBps: null, etaMs: null,
      });
    });

    expect(result.current.progress.total).toBeNull();
    expect(result.current.progress.percent).toBeNull();
  });

  // 18. Unmount aborts active downloads
  it('unmount aborts all active downloads', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { unmount } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    // Need to use renderHook result to interact
    const { result, unmount: unmountFn } = renderHook(() =>
      useDownloadQueue({ concurrency: 2, autoStart: true }),
    );

    act(() => {
      result.current.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
    });

    await act(async () => {});

    const activeHandles = [...handles];

    unmountFn();

    // Each active task's abort should have been called
    activeHandles.forEach((h) => {
      expect(h.task.abort).toHaveBeenCalled();
    });
  });

  // 19. Concurrency: only N items download simultaneously
  it('respects concurrency=1: only 1 item downloads at a time', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true }),
    );

    act(() => {
      result.current.add([
        'https://example.com/a.zip',
        'https://example.com/b.zip',
        'https://example.com/c.zip',
      ]);
    });

    await act(async () => {});

    expect(result.current.activeCount).toBe(1);
    expect(result.current.pendingCount).toBe(2);

    // Complete the first one
    await act(async () => {
      handles[0]!.capturedOptions.onSuccess?.(makeResult());
      handles[0]!.resolve(makeResult());
    });

    await act(async () => {});

    // Next should start
    expect(result.current.activeCount).toBe(1);
    expect(result.current.pendingCount).toBe(1);
  });

  // 20. isIdle is true when all items have settled
  it('isIdle is true when all items have settled', async () => {
    const handles: MockTaskHandle[] = [];

    mockDownloadFromUrl.mockImplementation((_url: string, opts: DownloadFromUrlOptions) => {
      const h = createMockTask(opts);
      handles.push(h);
      return h.task;
    });

    const { result } = renderHook(() =>
      useDownloadQueue({ concurrency: 1, autoStart: true }),
    );

    act(() => {
      result.current.add('https://example.com/file.zip');
    });

    await act(async () => {});

    expect(result.current.isIdle).toBe(false);

    await act(async () => {
      handles[0]!.capturedOptions.onSuccess?.(makeResult());
      handles[0]!.resolve(makeResult());
    });

    await act(async () => {});

    expect(result.current.isIdle).toBe(true);
  });
});
