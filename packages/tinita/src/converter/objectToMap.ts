import { assertObject } from '../asserts/assertObject';

/**
 * A plain object as a `Map`, recursively.
 *
 * **Deep**, unlike `mapToObject`, which is shallow - so the pair is not a
 * round-trip. A nested plain object becomes a nested `Map`; a value that is already
 * a `Map` is kept as-is rather than walked.
 *
 * Arrays are objects, so an array value becomes a `Map` keyed by `'0'`, `'1'` and so
 * on. If arrays should survive, convert them before calling.
 *
 * Only own enumerable string keys are copied. Throws `RangeError` on a cyclic
 * object: the recursion has no cycle guard, deliberately, because a `Map` of a cycle
 * has no finite representation. Measured: `RangeError: Maximum call stack size
 * exceeded`, thrown by the engine rather than by this function.
 *
 * The assertion runs on every recursive call because recursion re-enters this same
 * public export. That costs one `typeof` per node and never fires from the inside - the
 * recursive site has already confirmed the value is a non-null object - so it exists
 * for the outermost call. Without it `objectToMap(42)` returned an empty `Map` in
 * silence and `objectToMap(null)` threw `Object.keys`' own
 * `TypeError: Cannot convert undefined or null to object`, which names neither this
 * function nor its parameter.
 *
 * Returns a new `Map`; the object is never mutated.
 *
 * @throws {TypeError} if `obj` is `null` or not of type `object`.
 */
export const objectToMap = (
  obj: Record<string, unknown>
): Map<string, unknown> => {
  assertObject(obj, 'objectToMap', 'obj');

  const resultMap = new Map<string, unknown>();
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !(value instanceof Map)) {
      resultMap.set(key, objectToMap(value as Record<string, unknown>));
    } else {
      resultMap.set(key, value);
    }
  });
  return resultMap;
};
