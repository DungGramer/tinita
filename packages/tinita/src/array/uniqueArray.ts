/**
 * Get unique array
 * @example uniqueArray([1, 1, 2]) => [1, 2]
 */
export function uniqueArray<T>(list: Array<T>) {
  if (!list) return list;

  //? Using Reduce because it's faster than using Set
  return list.reduce((acc: Array<T>, item: T) => {
    if (!acc.some((i) => i === item)) {
      acc.push(item);
    }

    return acc;
  }, []);
}
