/**
 * Build an object to spread conditionally.
 *
 * ```ts
 * const payload = { id, ...conditionObj('name', name, Boolean(name)) };
 * ```
 *
 * Always returns an object, so the spread is always valid. The version this
 * replaced could return `false` or `undefined` while its type said
 * `Record<string, unknown> | undefined` - spreading those happens to produce `{}`,
 * so the lie was invisible until someone read the return value instead of
 * spreading it.
 *
 * With no `condition`, the value is included unless it is "empty": `null`,
 * `undefined`, `''`, `[]` or `{}`. Numbers and `false` are kept, because `0` and
 * `false` are values a caller means.
 *
 * @example
 * ```ts
 * conditionObj('a', 1);          // { a: 1 }
 * conditionObj('a', 1, false);   // {}
 * conditionObj('a', 0);          // { a: 0 }
 * conditionObj('a', '');         // {}
 * ```
 */
export function conditionObj(
  key: string,
  value: unknown,
  condition?: boolean
): Record<string, unknown> {
  if (!key) return {};
  if (condition !== undefined) return condition ? { [key]: value } : {};
  return isEmptyValue(value) ? {} : { [key]: value };
}

/** Narrow replacement for lodash `isEmpty`: `tinita` ships zero dependencies. */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
