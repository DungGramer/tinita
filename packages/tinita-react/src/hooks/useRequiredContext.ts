import { useContext, type Context } from 'react';

/**
 * Read a context that must have a Provider above it, throwing a message that names
 * the hook if it does not.
 *
 * The whole value of this over `useContext` is the error. Without it a missing
 * Provider surfaces as `Cannot read properties of null (reading 'items')` somewhere
 * inside the component that used the value - a message that names neither the
 * context nor the Provider the developer forgot. With it the first thing thrown says
 * what to add and where.
 *
 * The context must be created with `null` as its default (`createContext<T | null>(null)`),
 * because `null` is the signal that no Provider was found. A context with a real
 * default value can never be missing and does not need this.
 *
 * Set `Context.displayName` and the message uses it; otherwise pass `providerName`.
 *
 * Named `useRequiredContext`, and it lives in `hooks/`. The version this replaced
 * was `CreateContextHook` in `context/` - PascalCase, and named as though it built a
 * hook. It does not: it calls `useContext` directly, so it **is** a hook. ESLint's
 * `react-hooks/rules-of-hooks` says so too, and went red the moment the name stopped
 * being PascalCase - PascalCase had been hiding the violation by making the linter
 * read it as a component.
 *
 * @throws {Error} when the context value is `null`, with a message naming the hook
 *   and the Provider.
 *
 * @example
 * ```tsx
 * const CartContext = createContext<Cart | null>(null);
 * CartContext.displayName = 'CartProvider';
 *
 * export const useCart = () => useRequiredContext(CartContext, 'useCart');
 * // outside a Provider: Error: useCart must be used within a CartProvider
 * ```
 */
export function useRequiredContext<T>(
  context: Context<T | null>,
  hookName = 'useRequiredContext',
  providerName = 'provider'
): T {
  const value = useContext(context);

  if (value === null) {
    throw new Error(`${hookName} must be used within a ${context.displayName || providerName}`);
  }

  return value;
}
