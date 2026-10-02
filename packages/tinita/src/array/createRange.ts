import { assertInteger } from '../asserts/assertInteger';
/**
 * Integers from `start` to `end`, both ends included.
 *
 * Returns `[]` when `end < start` rather than throwing or counting backwards - ask
 * for an empty range and you get an empty range. For a descending list, reverse the
 * result.
 *
 * Allocates `end - start + 1` numbers eagerly. There is no guard on the size,
 * deliberately: a guard would have to invent a limit, and the caller knows theirs.
 * `createRange(1, 1e9)` will exhaust memory.
 *
 * Throws `TypeError` if either bound is not an integer. Fractional bounds have no
 * single right answer (`createRange(1, 2.5)` - two values or three?) so they are
 * refused instead of guessed.
 *
 * @example
 * ```ts
 * createRange(1, 4);   // [1, 2, 3, 4]
 * createRange(0, 0);   // [0]
 * createRange(4, 1);   // []
 * createRange(-2, 0);  // [-2, -1, 0]
 * ```
 */
export function createRange(start: number, end: number): number[] {
  // Two calls, not one combined check: the version this replaced reported
  // `got (1, 2.5)` without saying which bound was the problem.
  assertInteger(start, 'createRange', 'start');
  assertInteger(end, 'createRange', 'end');

  const length = end - start + 1;
  if (length <= 0) return [];

  return Array.from({ length }, (_, index) => start + index);
}
