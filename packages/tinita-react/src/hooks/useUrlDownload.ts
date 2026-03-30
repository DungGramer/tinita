import { useCallback, useEffect, useReducer, useRef } from 'react';
import { downloadFromUrl } from 'tinita/download';
import type {
  DownloadFromUrlOptions,
  DownloadProgress,
  DownloadResult,
  DownloadStatus,
  DownloadTask,
} from 'tinita/download';
import type { DownloadError } from 'tinita/download';

// Re-export types for user convenience
export type { DownloadFromUrlOptions, DownloadProgress, DownloadResult, DownloadStatus } from 'tinita/download';
export type { DownloadError } from 'tinita/download';

// ── State ────────────────────────────────────────────────────────────────────

type State = {
  status: DownloadStatus;
  progress: DownloadProgress | null;
  data: DownloadResult | null;
  error: DownloadError | null;
};

const initialState: State = {
  status: 'idle',
  progress: null,
  data: null,
  error: null,
};

// ── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START' }
  | { type: 'PROGRESS'; payload: DownloadProgress }
  | { type: 'SUCCESS'; payload: DownloadResult }
  | { type: 'FAILED'; payload: DownloadError }
  | { type: 'ABORTED' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return { status: 'starting', progress: null, data: null, error: null };
    case 'PROGRESS':
      return { ...state, status: 'downloading', progress: action.payload };
    case 'SUCCESS':
      return { status: 'completed', progress: state.progress, data: action.payload, error: null };
    case 'FAILED':
      return { status: 'failed', progress: state.progress, data: null, error: action.payload };
    case 'ABORTED':
      return { status: 'aborted', progress: state.progress, data: null, error: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

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

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook for file downloads with progress tracking, abort, and lifecycle callbacks.
 *
 * Follows the `useMutation` pattern from TanStack Query:
 * - Configure default options and callbacks at hook level
 * - Call `mutate(url)` or `mutateAsync(url)` with optional per-call overrides
 * - Access reactive state: `status`, `data`, `error`, `progress`
 *
 * @param options - Default download options + lifecycle callbacks (onSuccess, onError, onSettled)
 *
 * @example
 * ```tsx
 * // Basic usage
 * function ExportButton() {
 *   const download = useUrlDownload({
 *     headers: { Authorization: 'Bearer token' },
 *     onSuccess: (data) => toast.success(`Downloaded ${data.filename}`),
 *     onError: (err) => toast.error(err.message),
 *   });
 *
 *   return (
 *     <button
 *       onClick={() => download.mutate('/api/export', { filename: 'report.csv' })}
 *       disabled={download.isPending}
 *     >
 *       {download.isPending ? `${download.progress?.percent ?? 0}%` : 'Export'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Async with try/catch
 * const download = useUrlDownload();
 *
 * async function handleExport(reportId: string) {
 *   try {
 *     const result = await download.mutateAsync(`/api/reports/${reportId}/export`);
 *     console.log('Saved:', result.filename);
 *   } catch (err) {
 *     console.error('Failed:', err);
 *   }
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Dynamic URL with pre-configured options
 * const download = useUrlDownload({
 *   headers: { Authorization: `Bearer ${token}` },
 *   timeout: 60_000,
 *   throttleProgressMs: 200,
 *   onSettled: () => setExporting(false),
 * });
 *
 * // Call with different URLs
 * download.mutate(`/api/users/export`);
 * download.mutate(`/api/orders/export`, { filename: 'orders.csv' });
 * ```
 */
export function useUrlDownload(options?: UseUrlDownloadOptions): UseUrlDownloadReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  const taskRef = useRef<DownloadTask | null>(null);
  const mountedRef = useRef(true);
  const optionsRef = useRef(options);

  // Keep options ref in sync without re-renders
  optionsRef.current = options;

  // Track mounted state + cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      taskRef.current?.abort();
    };
  }, []);

  const executeDownload = useCallback((
    url: string | URL,
    mutateOptions?: MutateOptions,
  ): Promise<DownloadResult> => {
    // Abort any in-flight task
    taskRef.current?.abort();

    const hookOpts = optionsRef.current;

    // Merge: hook-level options < per-call options (per-call wins)
    const { onSuccess: hookOnSuccess, onError: hookOnError, onSettled: hookOnSettled, ...hookDownloadOpts } = hookOpts ?? {};
    const { onSuccess: callOnSuccess, onError: callOnError, onSettled: callOnSettled, ...callDownloadOpts } = mutateOptions ?? {};

    const mergedDownloadOpts: DownloadFromUrlOptions = {
      ...hookDownloadOpts,
      ...callDownloadOpts,
    };

    if (mountedRef.current) {
      dispatch({ type: 'START' });
    }

    // Create a wrapper promise that handles callbacks
    return new Promise<DownloadResult>((resolve, reject) => {
      const task = downloadFromUrl(url, {
        ...mergedDownloadOpts,
        onProgress: (progress) => {
          mergedDownloadOpts.onProgress?.(progress);
          if (mountedRef.current) {
            dispatch({ type: 'PROGRESS', payload: progress });
          }
        },
        onSuccess: (result) => {
          mergedDownloadOpts.onSuccess?.(result);
          if (mountedRef.current) {
            dispatch({ type: 'SUCCESS', payload: result });
          }
          // Hook-level → per-call → settled
          hookOnSuccess?.(result);
          callOnSuccess?.(result);
          hookOnSettled?.(result, null);
          callOnSettled?.(result, null);
          resolve(result);
        },
        onError: (error) => {
          mergedDownloadOpts.onError?.(error);
          if (mountedRef.current) {
            dispatch({ type: 'FAILED', payload: error });
          }
          hookOnError?.(error);
          callOnError?.(error);
          hookOnSettled?.(null, error);
          callOnSettled?.(null, error);
          reject(error);
        },
        onAbort: () => {
          mergedDownloadOpts.onAbort?.();
          if (mountedRef.current) {
            dispatch({ type: 'ABORTED' });
          }
          const abortError = new Error('Download aborted') as DownloadError;
          hookOnSettled?.(null, abortError);
          callOnSettled?.(null, abortError);
          reject(abortError);
        },
      });

      taskRef.current = task;
    });
  }, []);

  const mutate = useCallback((url: string | URL, mutateOptions?: MutateOptions) => {
    // Fire-and-forget: swallow rejection (errors go to callbacks + state)
    executeDownload(url, mutateOptions).catch(() => {});
  }, [executeDownload]);

  const mutateAsync = useCallback((url: string | URL, mutateOptions?: MutateOptions) => {
    return executeDownload(url, mutateOptions);
  }, [executeDownload]);

  const abort = useCallback(() => {
    taskRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    taskRef.current?.abort();
    taskRef.current = null;
    if (mountedRef.current) {
      dispatch({ type: 'RESET' });
    }
  }, []);

  return {
    mutate,
    mutateAsync,
    abort,
    reset,
    status: state.status,
    progress: state.progress,
    data: state.data,
    error: state.error,
    isIdle: state.status === 'idle',
    isPending: state.status === 'downloading' || state.status === 'starting',
    isSuccess: state.status === 'completed',
    isError: state.status === 'failed',
    isDownloading: state.status === 'downloading' || state.status === 'starting',
    isCompleted: state.status === 'completed',
  };
}
