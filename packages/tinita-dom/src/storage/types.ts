/**
 * One shape for `localStorage` and `sessionStorage`, with JSON on the way in and out.
 *
 * Named `JsonStore`, not `Storage`, because that is the important part: it
 * `JSON.stringify`s on write and `JSON.parse`s on read, so it is **not** a drop-in
 * for the Web Storage API and the two cannot be mixed on the same key.
 *
 * Nothing here throws. Every failure mode a browser actually produces - storage
 * disabled in a private window, quota exhausted, a value written by other code that
 * is not JSON - is reported in the return value instead. The version this replaced
 * called `JSON.parse` with no `try`, so one foreign value on a shared key made
 * `get` throw where its own `defaultValue` parameter promised a fallback.
 */
export interface JsonStore {
  /**
   * The stored value, or `fallback`.
   *
   * Returns `fallback` when the key is absent, when the stored text is not JSON, and
   * when storage itself is unavailable. It never throws and never logs.
   *
   * No validation is performed: whatever was stored comes back, typed as `T` on the
   * caller's word. Parse it if it crossed a version boundary.
   */
  get<T>(key: string, fallback: T): T;

  /**
   * Store `value` as JSON. `true` if it was written.
   *
   * `false`, not a throw, when the quota is exhausted or storage is unavailable -
   * both are ordinary conditions in a browser, and a caller writing a UI preference
   * should not have to wrap it in `try`.
   *
   * @throws {TypeError} if `value` cannot be serialised (a cycle, or a `BigInt`).
   *   That is a bug in the caller's data, not a condition of the environment, so it
   *   is not folded into the `false` return.
   */
  set(key: string, value: unknown): boolean;

  /** Remove one key. Silent when it is absent or storage is unavailable. */
  remove(key: string): void;

  /**
   * Remove **every** key in this storage area, including keys written by other code
   * on the same origin.
   *
   * It is not scoped to what this store wrote - `localStorage.clear()` has no such
   * notion - so on a shared origin prefer `remove`.
   */
  clear(): void;
}
