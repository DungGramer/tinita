export function Pick<T>(obj: T, keys: (keyof T)[]) {
  if (!obj) return obj;

  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }

    return acc;
  }, {} as Partial<T>);
}
