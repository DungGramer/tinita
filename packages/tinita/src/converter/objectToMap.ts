export const objectToMap = (obj: any): Map<string, any> => {
  const resultMap = new Map<string, any>();
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !(value instanceof Map)) {
      resultMap.set(key, objectToMap(value)); // Recursively convert nested objects to Map
    } else {
      resultMap.set(key, value);
    }
  });
  return resultMap;
};
