import { assertString } from '../asserts/assertString';

/**
 * `snake_case` to `Title Case`.
 *
 * Each `_`-separated segment is lowercased, then its first character is uppercased,
 * and segments are joined with a single space. Lowercasing the rest is the point:
 * `'USER_ID'` becomes `'User Id'`, which is what a label wants.
 *
 * Consecutive underscores produce empty segments and therefore extra spaces:
 * `'a__b'` becomes `'A  B'`. That is faithful rather than clever - collapse first
 * with `collapseWhitespace` if a single space is wanted.
 *
 * Throws `TypeError` on a non-string. The version this replaced called
 * `console.error` and then returned its argument unchanged, which was a side effect
 * on a global plus a silent failure, and was documented nowhere.
 *
 * @example
 * ```ts
 * snakeToTitleCase('hello_world');  // 'Hello World'
 * snakeToTitleCase('USER_ID');      // 'User Id'
 * snakeToTitleCase('single');       // 'Single'
 * ```
 */
export function snakeToTitleCase(value: string): string {
  assertString(value, 'snakeToTitleCase');

  return value
    .split('_')
    .map((segment) => {
      if (segment === '') return segment;
      const [first, ...rest] = segment.toLowerCase();

      return first.toUpperCase() + rest.join('');
    })
    .join(' ');
}
