export const objectToMap = (
  obj: Record<string, unknown>
): Map<string, unknown> => {
  const resultMap = new Map<string, unknown>();
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !(value instanceof Map)) {
      resultMap.set(key, objectToMap(value as Record<string, unknown>));
    } else {
      resultMap.set(key, value);
    }
  });
  return resultMap;
};
