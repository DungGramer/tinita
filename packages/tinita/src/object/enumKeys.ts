/**
 * The string keys of a TypeScript `enum`, without the reverse-mapped numeric ones.
 *
 * A numeric `enum` compiles to an object carrying both directions, so
 * `Object.keys` on `enum Direction { Up, Down }` yields
 * `['0', '1', 'Up', 'Down']`. This drops the numeric half.
 *
 * For a **string** enum there is no reverse mapping, so every key is already a name
 * and this behaves like `Object.keys`.
 *
 * A caveat worth knowing: a numeric enum member whose name is itself all digits
 * cannot be told apart from a reverse-mapped key and is dropped too. TypeScript
 * forbids such names in `enum` declarations, so this only bites a hand-built object
 * passed in as if it were an enum.
 *
 * Throws `TypeError` on a non-object.
 *
 * @example
 * ```ts
 * enum Direction { Up, Down }
 * enumKeys(Direction);  // ['Up', 'Down']
 * ```
 */
export function enumKeys<T extends object>(obj: T): Extract<keyof T, string>[] {
  if (obj === null || typeof obj !== 'object') {
    throw new TypeError(
      `enumKeys: expected an object, got ${obj === null ? 'null' : typeof obj}`
    );
  }

  return Object.keys(obj).filter(
    (key) => !Number.isFinite(Number(key))
  ) as Extract<keyof T, string>[];
}
