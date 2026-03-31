import type {
  DownloadFromUrlOptions,
  DownloadProgress,
  DownloadResult,
  QueueItem,
  QueueItemStatus,
} from 'tinita/download';
import type { DownloadError } from 'tinita/download';

// Re-export tinita types for convenience
export type { QueueItem, QueueItemStatus } from 'tinita/download';

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
