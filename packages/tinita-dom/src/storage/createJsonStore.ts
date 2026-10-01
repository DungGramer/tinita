import type { JsonStore } from './types';

/**
 * Build a `JsonStore` over a lazily-resolved Web Storage area.
 *
 * `resolve` is called on every operation rather than once at module load, for two
 * reasons: the module must import cleanly where `localStorage` does not exist (SSR),
 * and access can start throwing mid-session when a user changes site-data settings.
 */
export function createJsonStore(resolve: () => Storage): JsonStore {
  // Reading `window.localStorage` itself throws in a Safari private window and under
  // a "block site data" policy - not just the get/set calls. So the resolve is inside
  // the try as well.
  const area = (): Storage | null => {
    try {
      return resolve();
    } catch {
      return null;
    }
  };

  return {
    get<T>(key: string, fallback: T): T {
      const storage = area();
      if (!storage) return fallback;

      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        return fallback;
      }
      if (raw === null) return fallback;

      try {
        return JSON.parse(raw) as T;
      } catch {
        // A value another library wrote on the same key is not an error here.
        return fallback;
      }
    },

    set(key: string, value: unknown): boolean {
      // Serialise first and outside the storage try, so a cycle in the caller's data
      // surfaces as a TypeError instead of being reported as "quota exhausted".
      const serialised = JSON.stringify(value);
      if (serialised === undefined) {
        throw new TypeError(
          `JsonStore.set: value for "${key}" is not JSON-serialisable (got ${typeof value})`
        );
      }

      const storage = area();
      if (!storage) return false;

      try {
        storage.setItem(key, serialised);

        return true;
      } catch {
        // QuotaExceededError, and Safari private mode which throws on any write.
        return false;
      }
    },

    remove(key: string): void {
      try {
        area()?.removeItem(key);
      } catch {
        // Nothing to report: the key is gone either way.
      }
    },

    clear(): void {
      try {
        area()?.clear();
      } catch {
        // As above.
      }
    },
  };
}
