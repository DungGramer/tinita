/**
 * Establishes: `value` is a non-null `object`.
 *
 * **Arrays pass. Class instances pass. `Date`, `Map` and `Blob` pass.** This is
 * `typeof value === 'object' && value !== null`, nothing more, and the name says
 * `Object` rather than `PlainObject` for exactly that reason - a name that promised
 * "plain" while admitting arrays would hide the behaviour it is supposed to state.
 *
 * If the contract really is "a plain object and not an array", the caller needs a
 * prototype check as well. `omitEmptyValues` has one: it compares
 * `Object.getPrototypeOf(value)` against `Object.prototype` and `null`, because it
 * recurses and must not take a `Date` apart by its enumerable keys. That is a
 * different invariant and it stays where it is used.
 *
 * The error reports `typeof`, never the value. `String(value)` on an object runs a
 * custom `toString` if one exists, which is a side effect inside a failure path and
 * can itself throw.
 *
 * @throws {TypeError} if `value` is `null` or not of type `object`.
 *
 * @example
 * ```ts
 * assertObject(obj, 'pick', 'obj');
 * ```
 */
export function assertObject(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    throw new TypeError(
      `${caller}: ${label} must be an object, got ${value === null ? 'null' : typeof value}`
    );
  }
}
