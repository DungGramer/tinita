import { useCallback, useEffect, useReducer, useRef } from 'react';
import { downloadFromUrl } from 'tinita/download';
import type { DownloadFromUrlOptions, DownloadTask } from 'tinita/download';
import type { UseDownloadTaskReturn } from './use-download-task.types';
import { reducer, initialState } from './use-download-task.reducer';

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
