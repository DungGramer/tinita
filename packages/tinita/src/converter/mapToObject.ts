export const mapToObject = <V>(map: Map<string, V>): Record<string, V> => {
  const obj: Record<string, V> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};
