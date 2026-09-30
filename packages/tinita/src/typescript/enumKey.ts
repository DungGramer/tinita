/**
 * @example: enum E { foo, bar }, key = ['foo', 'bar', 0, 1]; enumKeys(E) = ['foo', 'bar']
 */
export function enumKeys<
  T extends Record<string, unknown>,
  Keys extends keyof T
>(obj: T): Keys[] {
  return Object.keys(obj).filter((k) => isNaN(Number(k))) as Keys[];
}
