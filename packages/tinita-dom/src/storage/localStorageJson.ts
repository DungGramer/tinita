import { createJsonStore } from './createJsonStore';
import type { JsonStore } from './types';

/**
 * `localStorage` with JSON on the way in and out. Survives the page closing.
 *
 * See `JsonStore` for the contract: nothing throws except a non-serialisable value,
 * and `get` falls back rather than failing.
 *
 * Importing this module is safe where `localStorage` does not exist; every operation
 * resolves it lazily. Calling `get` there returns the fallback and `set` returns
 * `false`.
 *
 * @example
 * ```ts
 * localStorageJson.set('theme', { mode: 'dark' });
 * localStorageJson.get('theme', { mode: 'light' });
 * ```
 */
export const localStorageJson: JsonStore = createJsonStore(() => localStorage);
