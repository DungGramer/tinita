/**
 * Read one element out of a value that may or may not be an array.
 *
 * For the shape an API returns as either `T` or `T[]` depending on the request.
 * A non-array is returned as-is and `index` is ignored.
 *
 * The return type is `T | undefined`, not `T`. The version this replaced declared
 * `T` while returning `undefined` for an out-of-range index - the type said the
 * caller never needed a check, and it was wrong.
 *
 * Never throws. A negative or out-of-range `index` yields `undefined`; negative
 * indices are **not** counted from the end, because `-1` meaning "last" is a
 * convention this function does not carry.
 *
 * @example
 * ```ts
 * getArrayValue(['a', 'b']);       // 'a'
 * getArrayValue(['a', 'b'], 1);    // 'b'
 * getArrayValue(['a'], 5);         // undefined
 * getArrayValue('a');              // 'a'
 * getArrayValue('a', 5);           // 'a' - index ignored for a non-array
 * ```
 */
export function getArrayValue<T>(value: T[] | T, index = 0): T | undefined {
  return Array.isArray(value) ? value[index] : value;
}
