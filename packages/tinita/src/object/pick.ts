import { assertArray } from '../asserts/assertArray';
import { assertObject } from '../asserts/assertObject';

/**
 * A new object holding only `keys` that `obj` actually owns.
 *
 * Inherited properties are skipped (`hasOwnProperty`), and a key that is absent is
 * simply not present in the result - it does not appear with value `undefined`, so
 * `'k' in pick(o, ['k'])` answers truthfully.
 *
 * The result is a plain object literal; `obj`'s prototype and its non-enumerable
 * and symbol properties are not carried over. Getters are read, not copied: the
 * result holds the value the getter returned at call time.
 *
 * Returns a new object; `obj` is never mutated.
 *
 * Throws `TypeError` if `obj` is not an object, or if `keys` is not an array. The
 * version this replaced returned the argument unchanged for `null`, which made a
 * `null` from upstream look like a successful pick.
 *
 * Exported as `pick`, lowercase. The version this replaced exported `Pick`, which
 * collides with TypeScript's built-in `Pick<T, K>` utility type - importing it put
 * a value and a type with the same name in one scope.
 *
 * @example
 * ```ts
 * pick({ a: 1, b: 2 }, ['a']);        // { a: 1 }
 * pick({ a: 1 }, ['a', 'zz' as never]); // { a: 1 } - absent key omitted entirely
 * ```
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  assertObject(obj, 'pick', 'obj');
  // Guard through an alias: `Array.isArray` narrows `readonly K[]` to `any[]`, which
  // loses K and makes every later index an implicit `any`.
  const keyList: unknown = keys;
  assertArray(keyList, 'pick', 'keyList');

  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }

  return result;
}
