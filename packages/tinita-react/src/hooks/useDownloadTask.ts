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
  result: DownloadResult | null;
  error: DownloadError | null;
};

const initialState: State = {
  status: 'idle',
  progress: null,
  result: null,
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
      return { status: 'starting', progress: null, result: null, error: null };
    case 'PROGRESS':
      return { ...state, status: 'downloading', progress: action.payload };
    case 'SUCCESS':
      return { status: 'completed', progress: state.progress, result: action.payload, error: null };
    case 'FAILED':
      return { status: 'failed', progress: state.progress, result: null, error: action.payload };
    case 'ABORTED':
      return { status: 'aborted', progress: state.progress, result: null, error: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ── Return type ───────────────────────────────────────────────────────────────

export type UseDownloadTaskReturn = {
  start: (url: string | URL, options?: DownloadFromUrlOptions) => void;
  abort: () => void;
  reset: () => void;
  status: DownloadStatus;
  progress: DownloadProgress | null;
  result: DownloadResult | null;
  error: DownloadError | null;
  isDownloading: boolean;
  isCompleted: boolean;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * React hook that manages a URL-based file download with progress tracking,
 * cancellation support, and lifecycle state management.
 *
 * Wraps `downloadFromUrl` from the `tinita` package and exposes its state
 * via a reducer for predictable updates.
 *
 * @example
 * ```tsx
 * function DownloadButton() {
 *   const { start, abort, status, progress, isDownloading } = useDownloadTask();
 *
 *   return (
 *     <div>
 *       <button onClick={() => start('https://example.com/file.zip')} disabled={isDownloading}>
 *         Download
 *       </button>
 *       {isDownloading && <button onClick={abort}>Cancel</button>}
 *       {progress?.percent != null && <progress value={progress.percent} max={100} />}
 *       <p>Status: {status}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With default options (e.g. auth headers)
 * const { start, reset, result, error } = useDownloadTask({
 *   headers: { Authorization: 'Bearer token' },
 *   timeout: 15_000,
 * });
 *
 * useEffect(() => {
 *   if (error) console.error('Download failed:', error.message);
 * }, [error]);
 * ```
 */
export function useDownloadTask(defaultOptions?: DownloadFromUrlOptions): UseDownloadTaskReturn {
  const [state, dispatch] = useReducer(reducer, initialState);

  const taskRef = useRef<DownloadTask | null>(null);
  const mountedRef = useRef(true);
  const defaultOptionsRef = useRef(defaultOptions);

  // Keep defaultOptionsRef in sync without triggering re-renders
  defaultOptionsRef.current = defaultOptions;

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      taskRef.current?.abort();
    };
  }, []);

  const start = useCallback((url: string | URL, options?: DownloadFromUrlOptions) => {
    // Abort any in-flight task before starting a new one
    taskRef.current?.abort();

    const mergedOptions: DownloadFromUrlOptions = {
      ...defaultOptionsRef.current,
      ...options,
    };

    if (mountedRef.current) {
      dispatch({ type: 'START' });
    }

    const task = downloadFromUrl(url, {
      ...mergedOptions,
      onProgress: (progress) => {
        mergedOptions.onProgress?.(progress);
        if (mountedRef.current) {
          dispatch({ type: 'PROGRESS', payload: progress });
        }
      },
      onSuccess: (result) => {
        mergedOptions.onSuccess?.(result);
        if (mountedRef.current) {
          dispatch({ type: 'SUCCESS', payload: result });
        }
      },
      onError: (error) => {
        mergedOptions.onError?.(error);
        if (mountedRef.current) {
          dispatch({ type: 'FAILED', payload: error });
        }
      },
      onAbort: () => {
        mergedOptions.onAbort?.();
        if (mountedRef.current) {
          dispatch({ type: 'ABORTED' });
        }
      },
    });

    taskRef.current = task;
  }, []);

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
    start,
    abort,
    reset,
    status: state.status,
    progress: state.progress,
    result: state.result,
    error: state.error,
    isDownloading: state.status === 'downloading' || state.status === 'starting',
    isCompleted: state.status === 'completed',
  };
}
