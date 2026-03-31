import type {
  DownloadFromUrlOptions,
  DownloadProgress,
  DownloadResult,
  DownloadStatus,
} from 'tinita/download';
import type { DownloadError } from 'tinita/download';

// Re-export types for user convenience
export type { DownloadFromUrlOptions, DownloadProgress, DownloadResult, DownloadStatus } from 'tinita/download';
export type { DownloadError } from 'tinita/download';

// ── State ────────────────────────────────────────────────────────────────────

export type State = {
  status: DownloadStatus;
  progress: DownloadProgress | null;
  data: DownloadResult | null;
  error: DownloadError | null;
};

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: DownloadProgress }
  | { type: 'SUCCESS'; payload: DownloadResult }
  | { type: 'FAILED'; payload: DownloadError }
  | { type: 'ABORTED' }
  | { type: 'RESET' };

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Callback options for the hook-level configuration.
 * These fire for every mutate/mutateAsync call.
 */
export interface UseUrlDownloadCallbacks {
  /** Called when download succeeds. Fires before per-call onSuccess. */
  onSuccess?: (data: DownloadResult) => void;
  /** Called when download fails. Fires before per-call onError. */
  onError?: (error: DownloadError) => void;
  /** Called when download completes (success or failure). Fires after onSuccess/onError. */
  onSettled?: (data: DownloadResult | null, error: DownloadError | null) => void;
}

/**
 * Hook-level configuration. Merges with per-call options.
 */
export interface UseUrlDownloadOptions extends DownloadFromUrlOptions, UseUrlDownloadCallbacks {}

/**
 * Per-call options passed to mutate/mutateAsync.
 * Can override hook-level options and add call-specific callbacks.
 */
export interface MutateOptions extends DownloadFromUrlOptions {
  /** Called on success for this specific call only. */
  onSuccess?: (data: DownloadResult) => void;
  /** Called on error for this specific call only. */
  onError?: (error: DownloadError) => void;
  /** Called when this specific call settles (success or failure). */
  onSettled?: (data: DownloadResult | null, error: DownloadError | null) => void;
}

// ── Return type ──────────────────────────────────────────────────────────────

export type UseUrlDownloadReturn = {
  /** Fire-and-forget download. Callbacks via hook options or per-call options. */
  mutate: (url: string | URL, options?: MutateOptions) => void;
  /** Download returning a promise. Rejects on error/abort. */
  mutateAsync: (url: string | URL, options?: MutateOptions) => Promise<DownloadResult>;
  /** Abort the current download. */
  abort: () => void;
  /** Reset to idle state. Aborts if active. */
  reset: () => void;
  /** Current download status. */
  status: DownloadStatus;
  /** Latest progress snapshot. */
  progress: DownloadProgress | null;
  /** Download result (null until completed). */
  data: DownloadResult | null;
  /** Error from the last failed download. */
  error: DownloadError | null;
  /** true when status is 'idle'. */
  isIdle: boolean;
  /** true when status is 'starting' or 'downloading'. */
  isPending: boolean;
  /** true when status is 'completed'. */
  isSuccess: boolean;
  /** true when status is 'failed'. */
  isError: boolean;
  /** true when status is 'starting' or 'downloading'. Alias for isPending. */
  isDownloading: boolean;
  /** true when status is 'completed'. Alias for isSuccess. */
  isCompleted: boolean;
};
