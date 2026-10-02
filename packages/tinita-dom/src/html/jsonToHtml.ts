import { assertObject } from 'tinita/asserts/assertObject';
import type { JsonHtmlElement } from './elementToJson';

/**
 * Serialise a `JsonHtmlElement` tree back to an HTML string.
 *
 * The inverse of `htmlToJson` for anything `htmlToJson` produced:
 * `jsonToHtml(htmlToJson(markup))` gives back equivalent markup, with attribute
 * order and whitespace normalised by the browser's serialiser.
 *
 * **Escaping is handled, and not by this function.** The tree is built with
 * `createElement` / `setAttribute` / `createTextNode` and then read back through
 * `outerHTML`, so the DOM serialiser escapes everything. Measured 2026-10-01:
 *
 * ```
 * text node  '<script>alert(1)</script>'  ->  &lt;script&gt;alert(1)&lt;/script&gt;
 * attribute  '"><img src=x onerror=1>'    ->  title="&quot;><img src=x onerror=1>"
 * ```
 *
 * **But it is a faithful serialiser, so untrusted JSON produces dangerous markup.**
 * `{ nodeName: 'img', attributes: { onerror: '...' } }` serialises to exactly that
 * `<img onerror="...">`. Escaping protects the *text*; it cannot protect you from a
 * tree that asks for an event handler. Only pass trees you produced, or sanitise the
 * tree first. Dropping attributes silently would be worse than saying this.
 *
 * @throws {TypeError} if `json` is not an object, or if a `nodeName` is not a valid
 *   HTML element name. The DOM throws `DOMException` for the latter ("a b" did not
 *   match the Name production), which names neither this function nor the offending
 *   node, so it is wrapped.
 *
 * @example
 * ```ts
 * jsonToHtml({ nodeName: 'p', attributes: { id: 'x' }, children: ['hi'] });
 * // '<p id="x">hi</p>'
 * ```
 */
export function jsonToHtml(json: JsonHtmlElement): string {
  return toElement(json).outerHTML;
}

function toElement(json: JsonHtmlElement): HTMLElement {
  assertObject(json, 'jsonToHtml', 'json');

  let element: HTMLElement;
  try {
    element = document.createElement(json.nodeName);
  } catch {
    throw new TypeError(
      `jsonToHtml: ${JSON.stringify(json.nodeName)} is not a valid HTML element name`
    );
  }

  for (const [name, value] of Object.entries(json.attributes ?? {})) {
    try {
      element.setAttribute(name, value);
    } catch {
      throw new TypeError(
        `jsonToHtml: ${JSON.stringify(name)} is not a valid attribute name`
      );
    }
  }

  for (const child of json.children ?? []) {
    element.appendChild(
      typeof child === 'string'
        ? document.createTextNode(child)
        : toElement(child)
    );
  }

  return element;
}
