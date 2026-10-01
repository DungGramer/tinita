/* eslint-disable @typescript-eslint/no-explicit-any -- phase 06 rewrites this file (JsonStore contract). */
export const sessionStorageJson = {
  get: (key: string, defaultValue = null) => {
    const value = sessionStorage.getItem(key);

    return value ? JSON.parse(value) : defaultValue;
  },
  set: (key: string, value: any) =>
    sessionStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => sessionStorage.removeItem(key),
  clear: () => sessionStorage.clear(),
};
