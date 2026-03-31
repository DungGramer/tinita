import type { QueueItem, QueueItemStatus } from './use-download-queue.types';
import type { DownloadProgress, DownloadResult } from 'tinita/download';
import type { DownloadError } from 'tinita/download';

// ── State ─────────────────────────────────────────────────────────────────────

export type QueueState = {
  items: QueueItem[];
  isPaused: boolean;
};

export const initialState: QueueState = {
  items: [],
  isPaused: false,
};

// ── Actions ───────────────────────────────────────────────────────────────────

export type QueueAction =
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

export function reducer(state: QueueState, action: QueueAction): QueueState {
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
