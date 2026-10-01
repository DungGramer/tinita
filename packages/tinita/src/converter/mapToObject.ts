/**
 * A `Map` with string keys as a plain object.
 *
 * Shallow: a nested `Map` stays a `Map`. Entries are copied in insertion order, so
 * `Object.keys` on the result follows the map's order except for integer-like keys,
 * which JavaScript always enumerates first in ascending numeric order.
 *
 * Nearly `Object.fromEntries(map)`, and worth having only because the generic keeps
 * the value type: `fromEntries` widens to `{ [k: string]: V }` while this returns
 * `Record<string, V>` with `V` inferred from the map.
 *
 * Returns a new object; the map is never mutated.
 */
export const mapToObject = <V>(map: Map<string, V>): Record<string, V> => {
  const obj: Record<string, V> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};
