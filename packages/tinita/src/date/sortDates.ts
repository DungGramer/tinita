import { assertArray } from '../asserts/assertArray';
/**
 * Sort date strings, oldest first by default.
 *
 * Returns a new array. The version this replaced called `arr.sort()`, which sorts
 * the caller's array in place - a surprise for anyone passing state or props.
 *
 * Anything `new Date()` cannot parse sorts to the end, in input order, rather than
 * scattering `NaN` comparisons through the result.
 *
 * @throws {TypeError} if `dates` is not an array.
 *
 * @example
 * ```ts
 * sortDates(['2021-01-01', '2020-01-01']);         // ['2020-01-01', '2021-01-01']
 * sortDates(['2020-01-01', '2021-01-01'], 'desc'); // ['2021-01-01', '2020-01-01']
 * ```
 */
export function sortDates(
  dates: string[],
  order: 'asc' | 'desc' = 'asc'
): string[] {
  assertArray(dates, 'sortDates', 'dates');

  const direction = order === 'asc' ? 1 : -1;

  return [...dates].sort((a, b) => {
    const left = new Date(a).getTime();
    const right = new Date(b).getTime();

    // An unparseable date gives NaN, and every comparison with NaN is false, so
    // leaving them in the comparator makes the whole sort order undefined.
    if (Number.isNaN(left)) return Number.isNaN(right) ? 0 : 1;
    if (Number.isNaN(right)) return -1;

    // The parenthesis matters. The version this replaced wrote
    // `left - right * direction`, and `*` binds tighter than `-`, so `desc`
    // computed `left + right` - not a reversal, not an ordering at all.
    return (left - right) * direction;
  });
}
