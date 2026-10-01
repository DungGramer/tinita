import { createJsonStore } from './createJsonStore';
import type { JsonStore } from './types';

/**
 * `sessionStorage` with JSON on the way in and out. Cleared when the tab closes, and
 * never shared between tabs.
 *
 * Same contract as `localStorageJson`; only the lifetime differs. Prefer this for
 * anything that should not outlive the visit - a draft, a wizard step, a scroll
 * position.
 *
 * @example
 * ```ts
 * sessionStorageJson.set('draft', { title: 'untitled' });
 * sessionStorageJson.get('draft', null);
 * ```
 */
export const sessionStorageJson: JsonStore = createJsonStore(
  () => sessionStorage
);
