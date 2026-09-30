import { sortAlphaText } from "../array/sortAlphaText";

export function sortObjectKeys<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;

  return sortAlphaText(Object.keys(obj)).reduce((acc, key) => {
    acc[key as keyof T] = obj[key as keyof T];

    return acc;
  }, {} as T);
}
