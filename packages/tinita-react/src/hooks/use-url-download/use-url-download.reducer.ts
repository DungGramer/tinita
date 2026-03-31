import type { State, Action } from './use-url-download.types';

export const initialState: State = {
  status: 'idle',
  progress: null,
  data: null,
  error: null,
};

export function reducer(state: State, action: Action): State {
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
