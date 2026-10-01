import { elementToJSON, type JSON_HTMLElement } from './elementToJSON';

/**
 * Parse an HTML fragment into a plain JSON tree.
 *
 * Only the **first element** of the fragment is converted. Text or comments before
 * it are skipped, and siblings after it are ignored.
 *
 * @throws {TypeError} if the fragment contains no element. The version this
 *   replaced passed `doc.body.firstElementChild` straight through, so an empty or
 *   text-only fragment handed `null` to `elementToJSON` and crashed there instead,
 *   with a message about the wrong function.
 *
 * @example
 * ```ts
 * htmlToJSON('<select id="cars"><option value="volvo">Volvo</option></select>');
 * // {
 * //   nodeName: 'select',
 * //   attributes: { id: 'cars' },
 * //   children: [{ nodeName: 'option', attributes: { value: 'volvo' }, children: ['Volvo'] }]
 * // }
 * ```
 */
export function htmlToJSON(html: string): JSON_HTMLElement {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;

  if (!root) {
    throw new TypeError('htmlToJSON() found no element in the given HTML');
  }

  return elementToJSON(root);
}
