/**
 * Map component props to `data-*` attributes.
 *
 * The single gate a variant or state passes through on its way from React to the
 * DOM, so every component shares one convention.
 *
 * Why `data-*` and not class strings: `variant × size × state × orientation`
 * multiplies into an unbounded set of class strings; one attribute per dimension
 * does not. The state is also readable straight from DevTools without decoding a
 * class string.
 */

export type VariantValue = string | number | boolean | null | undefined;

/**
 * Booleans render explicitly as `'true'` / `'false'`; the attribute is not dropped
 * when false.
 *
 * This differs from the present/absent convention because the CSS keys off the
 * value: `[data-indicator='false']` and `[data-show-arrow='false']` are real rules,
 * and dropping the attribute would kill them silently.
 *
 * Consequence: `[data-indicator]` matches both states. In component CSS always
 * write the full value, never a bare `[data-indicator]` for a boolean.
 *
 * `undefined` and `null` drop the attribute entirely, which means "no opinion,
 * follow the host". `theme` uses exactly this: left unset the component follows the
 * host's dark mode, passing `'light'` or `'dark'` forces it.
 *
 * camelCase keys become kebab: `borderRadius` -> `data-border-radius`.
 */
export function variantAttributes(variants: Record<string, VariantValue>): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(variants)) {
    if (value === undefined || value === null) continue;

    const name = `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    attributes[name] = String(value);
  }

  return attributes;
}
