import { useReducer } from 'react';

/**
 * Force a re-render on demand.
 *
 * Returns `[token, refresh]`. Calling `refresh` increments `token` and re-renders;
 * the token is useful as a dependency or a `key` when something must be rebuilt.
 *
 * **This is an escape hatch, and almost every use of it is a design smell.** React
 * re-renders when state or props change, so needing to force one usually means the
 * real data is being held somewhere React cannot see - a mutable ref, a module-level
 * variable, an external store. The fix is nearly always to move that data into state
 * or to subscribe to it with `useSyncExternalStore`, not to re-render over it.
 *
 * It is documented this way deliberately: it is the first tool a developer reaches
 * for when a render does not happen, and reaching for it hides the cause.
 *
 * Legitimate uses are narrow: re-running an imperative measurement, remounting a
 * third-party widget that has no update path, retrying a non-React resource.
 *
 * `useReducer` rather than `useState`, so the increment needs no current value and
 * `refresh` is stable for the component's whole life - safe in a dependency array.
 *
 * @example
 * ```tsx
 * const [token, refresh] = useRefreshComponent();
 * useEffect(() => { measure(); }, [token]);
 * <button onClick={refresh}>Re-measure</button>
 * ```
 */
export function useRefreshComponent(): [number, () => void] {
  const [token, refresh] = useReducer((value: number) => value + 1, 0);

  return [token, refresh];
}
