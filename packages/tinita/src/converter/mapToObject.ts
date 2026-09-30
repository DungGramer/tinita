export const mapToObject = (map: Map<string, any>): Record<string, any> => {
  const obj: Record<string, any> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
};
