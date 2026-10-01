import type { JsonHtmlElement } from './elementToJson';

export function jsonToHtml(json: JsonHtmlElement): string {
  function jsonToElement(json: JsonHtmlElement): HTMLElement {
    const element = document.createElement(json?.nodeName);
    if (json.attributes) {
      for (const [key, value] of Object.entries(json.attributes)) {
        element.setAttribute(key, value);
      }
    }
    json.children.forEach((child) => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(jsonToElement(child));
      }
    });
    return element;
  }

  const element = jsonToElement(json);
  return element.outerHTML;
}
