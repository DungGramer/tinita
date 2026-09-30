export function Omit<T>(obj: T, keys: Array<keyof T>): Partial<T> {
  if (!obj) return obj;

  return Object.keys(obj).reduce((acc, key) => {
    if (!keys.includes(key as keyof T)) {
      (acc as T)[key as keyof T] = obj[key as keyof T];
    }
    return acc;
  }, {} as Partial<T>);
}
