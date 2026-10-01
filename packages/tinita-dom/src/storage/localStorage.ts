export const localStorageAction = {
  get: (key: string, defaultValue = null) => {
    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : defaultValue;
  },
  set: (key: string, value: any) =>
    localStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
};
