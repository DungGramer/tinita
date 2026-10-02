/**
 * A plain, JSON-safe shape for an element tree.
 *
 * A child is either a nested element or a string of text. Comments, processing
 * instructions and CDATA have no place in it, and `elementToJson` drops them.
 */
export interface JsonHtmlElement {
  nodeName: string;
  attributes: { [key: string]: string };
  children: (JsonHtmlElement | string)[];
}

/**
 * Convert an element and its subtree to plain JSON.
 *
 * `nodeName` is lowercased, so an HTML element always reads `'div'` regardless of
 * how it was written. Attribute order follows the document.
 *
 * Text nodes become strings **including whitespace-only ones**, so formatted markup
 * yields children like `'\n  '`. That is faithful rather than tidy; filter the tree
 * if the whitespace is noise.
 *
 * Comments and other non-element, non-text nodes are **dropped**. The version this
 * replaced mapped them to `''`, which left empty strings scattered through
 * `children` and made the tree compare unequal to one parsed from the same markup
 * without comments.
 *
 * This reads the live DOM: a `<template>`'s content is in `.content`, not in
 * `childNodes`, so a template serialises as empty. Shadow roots are likewise
 * invisible.
 *
 * @throws {TypeError} if `element` is not an `Element`. The version this replaced
 *   guarded with `if (element.attributes)` and so threw
 *   `Cannot read properties of null` one line earlier instead.
 */
export function elementToJson(element: Element): JsonHtmlElement {
  // assert-reuse-ignore không phải kiểm một string: đây là cách nhận ra một Element
  // mà không dựa vào `instanceof Element`, thứ gãy khi node đến từ realm khác
  // (iframe, DOMParser). assertString sẽ kiểm sai thứ.
  if (!element || typeof element.nodeName !== 'string') {
    throw new TypeError(
      `elementToJson: expected an Element, got ${element === null ? 'null' : typeof element}`
    );
  }

  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes ?? [])) {
    attributes[attribute.name] = attribute.value;
  }

  const children: (JsonHtmlElement | string)[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(elementToJson(child as Element));
    } else if (child.nodeType === Node.TEXT_NODE) {
      children.push(child.textContent ?? '');
    }
    // Comments and everything else are dropped rather than mapped to ''.
  }

  return { nodeName: element.nodeName.toLowerCase(), attributes, children };
}
