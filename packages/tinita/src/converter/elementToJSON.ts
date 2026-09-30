export interface JSON_HTMLElement {
  nodeName: string;
  attributes: { [key: string]: string };
  children: (JSON_HTMLElement | string)[];
}

export function elementToJSON(element: Element): JSON_HTMLElement {
  const nodeName = element.nodeName.toLowerCase();
  const attributes: { [key: string]: string } = {};
  if (element.attributes) {
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });
  }
  const children: (JSON_HTMLElement | string)[] = Array.from(
    element.childNodes
  ).map((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return elementToJSON(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent || '';
    } else {
      return '';
    }
  });

  return { nodeName, attributes, children };
}
