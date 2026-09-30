export function uniquePushArray<T extends Record<string, any>>(
  list: T[],
  itemsToAdd: T | T[],
  uniqueKey: keyof T = 'value' as keyof T
): T[] {
  if (!Array.isArray(list) || isEmpty(itemsToAdd))
    return list;

  const items = Array.isArray(itemsToAdd) ? itemsToAdd : [itemsToAdd];

  const existingKeys = new Set(list.map((item) => item[uniqueKey]));

  const newUniqueItems = items.filter((item) => {
    const key = item[uniqueKey];
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      return true;
    }
    return false;
  });

  return [...newUniqueItems, ...list];
}
