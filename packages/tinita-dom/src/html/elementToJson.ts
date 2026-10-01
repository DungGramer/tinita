export interface JsonHtmlElement {
  nodeName: string;
  attributes: { [key: string]: string };
  children: (JsonHtmlElement | string)[];
}

export function elementToJson(element: Element): JsonHtmlElement {
  const nodeName = element.nodeName.toLowerCase();
  const attributes: { [key: string]: string } = {};
  if (element.attributes) {
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });
  }
  const children: (JsonHtmlElement | string)[] = Array.from(
    element.childNodes
  ).map((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return elementToJson(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent || '';
    } else {
      return '';
    }
  });

  return { nodeName, attributes, children };
}
