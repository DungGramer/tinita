/* eslint-disable @typescript-eslint/no-explicit-any -- phase 06 rewrites this file (JsonStore contract, no throw on bad JSON). */
export const localStorageJson = {
  get: (key: string, defaultValue = null) => {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : defaultValue;
  },
  set: (key: string, value: any) =>
    localStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
};
