import { useContext, Context } from 'react';

export function useRequiredContext<T>(
  context: Context<T | null>,
  hookName = 'useRequiredContext',
  providerName = 'provider'
): ReturnType<typeof useContext<T>> {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within a ${context.displayName || providerName}`);
  }
  return value;
}
