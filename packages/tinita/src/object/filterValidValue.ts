import { isEmpty } from 'lodash-es';

// Delete all invalid value in object
export function filterValidValue<T>(
  obj: T,
  options?: {
    invalidList?: any[];
    invalidKey?: (keyof T)[] | any[];
  }
): T {
  const invalidList = options?.invalidList || [null, undefined];
  const invalidKey = options?.invalidKey || ['page', 'size'];
  if (isEmpty(obj)) return obj;

  return Object.keys(obj).reduce((acc, key) => {
    if (invalidKey.includes(key)) return acc;
    if (invalidList.includes(obj[key])) return acc;
    if (Array.isArray(obj[key])) {
      if (obj[key].length === 0) return acc;

      acc[key] = obj[key];

      return acc;
    }

    if (typeof obj[key] === 'object') {
      acc[key] = filterValidValue(obj[key], { invalidKey, invalidList });

      return acc;
    }

    return {
      ...acc,
      [key]: obj[key],
    };
  }, {} as T);
}
