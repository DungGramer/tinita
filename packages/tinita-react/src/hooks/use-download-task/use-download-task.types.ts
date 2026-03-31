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
  result: DownloadResult | null;
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
