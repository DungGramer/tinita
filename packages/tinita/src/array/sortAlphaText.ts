export function sortAlphaText<T>(
  arr: T[],
  type: 'asc' | 'desc' = 'asc',
  keySelector?: (item: T) => string
): T[] {
  if (!arr) return arr;

  return arr.sort((a, b) => {
    const keyA = keySelector ? keySelector(a) : (a as unknown as string);
    const keyB = keySelector ? keySelector(b) : (b as unknown as string);

    return keyA.localeCompare(keyB) * (type === 'asc' ? 1 : -1);
  });
}
