import { useCallback, useEffect, useReducer, useRef } from 'react';
import pLimit from 'p-limit';
import { downloadFromUrl } from 'tinita/download';
import type {
  DownloadFromUrlOptions,
  DownloadProgress,
  DownloadResult,
  DownloadTask,
} from 'tinita/download';
import type { DownloadError } from 'tinita/download';

// ── Queue-specific types (defined locally; will be re-exported once Phase 02 lands in tinita) ──

/** Lifecycle status of a single item in the download queue. */
export type QueueItemStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'aborted';

/** A single item tracked by the download queue. */
export interface QueueItem {
  /** Unique identifier assigned when the item is added. */
  id: string;
  /** The download URL. */
  url: string | URL;
  /** Current lifecycle status. */
  status: QueueItemStatus;
  /** Latest progress snapshot, or `null` if not yet started. */
  progress: DownloadProgress | null;
  /** Download result once completed, otherwise `null`. */
  result: DownloadResult | null;
  /** Error from a failed download, otherwise `null`. */
  error: DownloadError | null;
  /** Per-item download options (merged with queue-level options). */
  options?: DownloadFromUrlOptions;
}

// ── Public API types ──────────────────────────────────────────────────────────

/**
 * Flexible input accepted by `useDownloadQueue.add()`.
 *
 * - `string | URL` — bare URL; uses queue-level options
 * - `object`       — URL + per-item options override
 */
export type QueueInput =
  | string
  | URL
  | { url: string | URL; options?: DownloadFromUrlOptions };

/** Aggregate progress across all currently-active downloads. */
export interface AggregateProgress {
  /** Total bytes loaded across all active items. */
  loaded: number;
  /**
   * Total bytes expected across all active items.
   * `null` when any active item has an unknown total.
   */
  total: number | null;
  /**
   * Overall percentage 0-100.
   * `null` when `total` is unknown.
   */
  percent: number | null;
}

/**
 * Hook-level options for `useDownloadQueue`.
 *
 * Extends `DownloadFromUrlOptions` (minus per-download lifecycle callbacks)
 * with queue-specific controls.
 */
export interface UseDownloadQueueOptions
  extends Omit<DownloadFromUrlOptions, 'onProgress' | 'onSuccess' | 'onError' | 'onAbort'> {
  /**
   * Maximum number of simultaneous downloads.
   * @default 3
   */
  concurrency?: number;
  /**
   * Start processing immediately whenever items are added.
   * Set to `false` to build up the queue before calling `resume()`.
   * @default true
   */
  autoStart?: boolean;
  /** Called when a single item succeeds. */
  onItemSuccess?: (item: QueueItem) => void;
  /** Called when a single item fails. */
  onItemError?: (item: QueueItem) => void;
  /**
   * Called when all items have settled (completed, failed, or aborted).
   * Fires only when the queue transitions from active/pending to fully settled.
   */
  onAllSettled?: (items: QueueItem[]) => void;
}

/** Return value of `useDownloadQueue`. */
export interface UseDownloadQueueReturn {
  /** Add one or more URLs (or inputs) to the queue. Returns the assigned IDs. */
  add: (input: QueueInput | QueueInput[]) => string[];
  /** Remove a pending item from the queue by ID. No-op for non-pending items. */
  remove: (id: string) => void;
  /** Pause the queue — active downloads continue; no new ones start. */
  pause: () => void;
  /** Resume a paused queue. */
  resume: () => void;
  /** Abort a specific active download by ID. */
  abort: (id: string) => void;
  /** Abort all active downloads and mark all pending items as aborted. */
  abortAll: () => void;
  /** Remove all completed, failed, and aborted items from the list. */
  clear: () => void;
  /** Re-queue a failed item (resets it to `'pending'`). */
  retry: (id: string) => void;

  /** All items currently tracked by the queue. */
  items: QueueItem[];
  /** Number of items with status `'downloading'`. */
  activeCount: number;
  /** Number of items with status `'pending'`. */
  pendingCount: number;
  /** Aggregate progress across all active downloads. */
  progress: AggregateProgress;
  /** `true` when the queue has no items or every item has settled. */
  isIdle: boolean;
  /** `true` when the queue is paused. */
  isPaused: boolean;
}

// ── State ─────────────────────────────────────────────────────────────────────

type QueueState = {
  items: QueueItem[];
  isPaused: boolean;
};

const initialState: QueueState = {
  items: [],
  isPaused: false,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type QueueAction =
  | { type: 'ADD'; payload: QueueItem[] }
  | { type: 'REMOVE'; payload: string }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: QueueItemStatus } }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: DownloadProgress } }
  | { type: 'UPDATE_RESULT'; payload: { id: string; result: DownloadResult } }
  | { type: 'UPDATE_ERROR'; payload: { id: string; error: DownloadError } }
  | { type: 'RETRY_ITEM'; payload: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CLEAR_SETTLED' }
  | { type: 'ABORT_ALL' };

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'ADD':
      return { ...state, items: [...state.items, ...action.payload] };

    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter(
          (item) => !(item.id === action.payload && item.status === 'pending'),
        ),
      };

    case 'UPDATE_STATUS':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, status: action.payload.status }
            : item,
        ),
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, progress: action.payload.progress }
            : item,
        ),
      };

    case 'UPDATE_RESULT':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, result: action.payload.result, status: 'completed' }
            : item,
        ),
      };

    case 'UPDATE_ERROR':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, error: action.payload.error, status: 'failed' }
            : item,
        ),
      };

    case 'RETRY_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload && item.status === 'failed'
            ? { ...item, status: 'pending' as QueueItemStatus, progress: null, result: null, error: null }
            : item,
        ),
      };

    case 'PAUSE':
      return { ...state, isPaused: true };

    case 'RESUME':
      return { ...state, isPaused: false };

    case 'CLEAR_SETTLED': {
      const settled: QueueItemStatus[] = ['completed', 'failed', 'aborted'];
      return {
        ...state,
        items: state.items.filter((item) => !settled.includes(item.status)),
      };
    }

    case 'ABORT_ALL':
      return {
        ...state,
        items: state.items.map((item) =>
          item.status === 'pending' || item.status === 'downloading'
            ? { ...item, status: 'aborted' }
            : item,
        ),
      };

    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeInput(input: QueueInput): { url: string | URL; options?: DownloadFromUrlOptions } {
  if (typeof input === 'string' || input instanceof URL) {
    return { url: input };
  }
  return input;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * React hook for managing a queue of file downloads with concurrency control.
 *
 * Supports adding multiple URLs, pausing/resuming the queue, aborting individual
 * or all downloads, retrying failed items, and tracking aggregate progress.
 *
 * @param options - Queue configuration: concurrency, autoStart, and lifecycle callbacks.
 *
 * @example
 * ```tsx
 * // Basic multi-file download
 * function DownloadAll() {
 *   const queue = useDownloadQueue({
 *     concurrency: 2,
 *     onItemSuccess: (item) => console.log('Done:', item.url),
 *     onAllSettled: (items) => console.log('All finished', items.length),
 *   });
 *
 *   const start = () =>
 *     queue.add([
 *       'https://example.com/file1.pdf',
 *       'https://example.com/file2.zip',
 *       { url: 'https://example.com/file3.csv', options: { filename: 'data.csv' } },
 *     ]);
 *
 *   return (
 *     <div>
 *       <button onClick={start}>Download All</button>
 *       <button onClick={queue.pause} disabled={queue.isPaused}>Pause</button>
 *       <button onClick={queue.resume} disabled={!queue.isPaused}>Resume</button>
 *       <button onClick={queue.abortAll}>Cancel</button>
 *       <p>
 *         Active: {queue.activeCount} | Pending: {queue.pendingCount}
 *         {queue.progress.percent != null && ` | ${queue.progress.percent}%`}
 *       </p>
 *       <ul>
 *         {queue.items.map((item) => (
 *           <li key={item.id}>
 *             {String(item.url)} — {item.status}
 *             {item.status === 'failed' && (
 *               <button onClick={() => queue.retry(item.id)}>Retry</button>
 *             )}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Paused queue — add items first, then start manually
 * const queue = useDownloadQueue({ autoStart: false, concurrency: 1 });
 *
 * queue.add(['https://example.com/a.zip', 'https://example.com/b.zip']);
 * // Nothing starts yet
 * queue.resume(); // Now processing begins
 * ```
 */
export function useDownloadQueue(options?: UseDownloadQueueOptions): UseDownloadQueueReturn {
  // autoStart: false → start paused; resume() unpauses
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    isPaused: options?.autoStart === false,
  });

  // Ref map of active XHR tasks: id → DownloadTask
  const tasksRef = useRef<Map<string, DownloadTask>>(new Map());
  const mountedRef = useRef(true);
  const optionsRef = useRef(options);
  // Keep a stable ref to latest items/isPaused for processQueue (avoids stale closures)
  const itemsRef = useRef(state.items);
  const isPausedRef = useRef(state.isPaused);

  // Track whether onAllSettled already fired for this settled batch
  const wasSettledRef = useRef(false);

  // p-limit instance for concurrency control
  const limitRef = useRef(pLimit(options?.concurrency ?? 3));
  // Track scheduled item IDs to prevent double-scheduling
  const scheduledRef = useRef<Set<string>>(new Set());

  // Sync refs on every render
  optionsRef.current = options;
  itemsRef.current = state.items;
  isPausedRef.current = state.isPaused;

  // Update p-limit concurrency when option changes
  const concurrency = options?.concurrency ?? 3;
  if (limitRef.current.concurrency !== concurrency) {
    limitRef.current.concurrency = concurrency;
  }

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tasksRef.current.forEach((task) => task.abort());
      tasksRef.current.clear();
    };
  }, []);

  /**
   * Execute a single download within a p-limit slot.
   * Wires XHR callbacks back to the reducer and task map.
   */
  const executeItem = useCallback((item: QueueItem): Promise<void> => {
    // Mark as downloading
    if (mountedRef.current) {
      dispatch({ type: 'UPDATE_STATUS', payload: { id: item.id, status: 'downloading' } });
    }

    // Strip queue-specific keys before forwarding to downloadFromUrl
    const {
      concurrency: _c,
      autoStart: _a,
      onItemSuccess,
      onItemError,
      onAllSettled: _onAllSettled,
      ...baseOpts
    } = optionsRef.current ?? {};

    const mergedOpts: DownloadFromUrlOptions = {
      ...baseOpts,
      ...item.options,
      onProgress: (progress) => {
        item.options?.onProgress?.(progress);
        if (mountedRef.current) {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { id: item.id, progress } });
        }
      },
      onSuccess: (result) => {
        item.options?.onSuccess?.(result);
        tasksRef.current.delete(item.id);
        scheduledRef.current.delete(item.id);
        if (mountedRef.current) {
          dispatch({ type: 'UPDATE_RESULT', payload: { id: item.id, result } });
          const updatedItem: QueueItem = { ...item, status: 'completed', result, error: null };
          onItemSuccess?.(updatedItem);
        }
      },
      onError: (error) => {
        item.options?.onError?.(error);
        tasksRef.current.delete(item.id);
        scheduledRef.current.delete(item.id);
        if (mountedRef.current) {
          dispatch({ type: 'UPDATE_ERROR', payload: { id: item.id, error } });
          const updatedItem: QueueItem = { ...item, status: 'failed', error, result: null };
          onItemError?.(updatedItem);
        }
      },
      onAbort: () => {
        item.options?.onAbort?.();
        tasksRef.current.delete(item.id);
        scheduledRef.current.delete(item.id);
        if (mountedRef.current) {
          dispatch({ type: 'UPDATE_STATUS', payload: { id: item.id, status: 'aborted' } });
        }
      },
    };

    const task = downloadFromUrl(item.url, mergedOpts);
    tasksRef.current.set(item.id, task);

    // Wait for the task to settle (success or error) before releasing the p-limit slot
    return task.promise.then(() => {}, () => {});
  }, []);

  /**
   * Schedule pending items through p-limit.
   * p-limit handles concurrency — we just feed items in.
   */
  const processQueue = useCallback(() => {
    if (isPausedRef.current) return;

    const items = itemsRef.current;
    for (const item of items) {
      if (item.status !== 'pending') continue;
      if (scheduledRef.current.has(item.id)) continue;

      scheduledRef.current.add(item.id);
      // p-limit queues this; it will execute when a slot is free
      limitRef.current(() => executeItem(item));
    }
  }, [executeItem]);

  // Trigger processQueue whenever items or isPaused changes
  useEffect(() => {
    processQueue();
  }, [state.items, state.isPaused, processQueue]);

  // Fire onAllSettled exactly once when queue transitions from active → fully settled
  useEffect(() => {
    const opts = optionsRef.current;
    if (state.items.length === 0) {
      wasSettledRef.current = false;
      return;
    }

    const settledStatuses: QueueItemStatus[] = ['completed', 'failed', 'aborted'];
    const allSettled = state.items.every((item) => settledStatuses.includes(item.status));

    if (allSettled) {
      if (!wasSettledRef.current) {
        wasSettledRef.current = true;
        opts?.onAllSettled?.(state.items);
      }
    } else {
      // Queue is active/pending again (e.g. after retry or add) — reset the flag
      wasSettledRef.current = false;
    }
  }, [state.items]);

  // ── Public methods ──────────────────────────────────────────────────────────

  const add = useCallback((input: QueueInput | QueueInput[]): string[] => {
    const inputs = Array.isArray(input) ? input : [input];
    const newItems: QueueItem[] = inputs.map((raw) => {
      const { url, options: itemOptions } = normalizeInput(raw);
      return {
        id: generateId(),
        url,
        status: 'pending' as QueueItemStatus,
        progress: null,
        result: null,
        error: null,
        options: itemOptions,
      };
    });
    if (mountedRef.current) {
      dispatch({ type: 'ADD', payload: newItems });
    }
    return newItems.map((item) => item.id);
  }, []);

  const remove = useCallback((id: string) => {
    if (mountedRef.current) {
      dispatch({ type: 'REMOVE', payload: id });
    }
  }, []);

  const pause = useCallback(() => {
    if (mountedRef.current) {
      dispatch({ type: 'PAUSE' });
    }
  }, []);

  const resume = useCallback(() => {
    if (mountedRef.current) {
      dispatch({ type: 'RESUME' });
    }
  }, []);

  const abort = useCallback((id: string) => {
    const task = tasksRef.current.get(id);
    if (task) {
      task.abort();
      // onAbort callback in startItem handles cleanup + dispatch
    }
  }, []);

  const abortAll = useCallback(() => {
    // Abort all active tasks
    tasksRef.current.forEach((task) => task.abort());
    // Mark remaining pending items as aborted
    if (mountedRef.current) {
      dispatch({ type: 'ABORT_ALL' });
    }
  }, []);

  const clear = useCallback(() => {
    if (mountedRef.current) {
      dispatch({ type: 'CLEAR_SETTLED' });
    }
  }, []);

  const retry = useCallback((id: string) => {
    const item = itemsRef.current.find((i) => i.id === id && i.status === 'failed');
    if (!item) return;
    // Reset to pending with clean state so processQueue picks it up
    if (mountedRef.current) {
      dispatch({ type: 'RETRY_ITEM', payload: id });
    }
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────

  const activeCount = state.items.filter((i) => i.status === 'downloading').length;
  const pendingCount = state.items.filter((i) => i.status === 'pending').length;

  const activeItems = state.items.filter((i) => i.status === 'downloading');
  const loaded = activeItems.reduce((sum, i) => sum + (i.progress?.loaded ?? 0), 0);
  const totals = activeItems.map((i) => i.progress?.total ?? null);
  const total = totals.length > 0 && totals.every((t) => t !== null)
    ? totals.reduce<number>((sum, t) => sum + (t as number), 0)
    : null;
  const percent = total !== null && total > 0 ? Math.round((loaded / total) * 100) : null;

  const progress: AggregateProgress = { loaded, total, percent };

  const settled: QueueItemStatus[] = ['completed', 'failed', 'aborted'];
  const isIdle =
    state.items.length === 0 || state.items.every((i) => settled.includes(i.status));

  return {
    add,
    remove,
    pause,
    resume,
    abort,
    abortAll,
    clear,
    retry,
    items: state.items,
    activeCount,
    pendingCount,
    progress,
    isIdle,
    isPaused: state.isPaused,
  };
}
