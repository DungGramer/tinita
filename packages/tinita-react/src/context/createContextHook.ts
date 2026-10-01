import { useContext, Context } from 'react';

function CreateContextHook<T>(
  Context: Context<T | null>,
  hookName = 'createContextHook',
  providerName = 'provider'
): ReturnType<typeof useContext<T>> {
  const context = useContext(Context);
  if (context === null) {
    throw new Error(`${hookName} must be used within a ${Context.displayName || providerName}`);
  }
  return context;
}

export default CreateContextHook;
