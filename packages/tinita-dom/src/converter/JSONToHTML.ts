import type { JSON_HTMLElement } from './elementToJSON';

export function jsonToHTML(json: JSON_HTMLElement): string {
  function jsonToElement(json: JSON_HTMLElement): HTMLElement {
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
