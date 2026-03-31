import { useCallback, useEffect, useReducer, useRef } from 'react';
import { downloadFromUrl, AbortDownloadError } from 'tinita/download';
import type { DownloadFromUrlOptions, DownloadResult, DownloadTask } from 'tinita/download';
import type { UseUrlDownloadOptions, UseUrlDownloadReturn, MutateOptions } from './use-url-download.types';
import { reducer, initialState } from './use-url-download.reducer';

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
          const abortError = new AbortDownloadError();
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
