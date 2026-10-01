import { elementToJSON, type JSON_HTMLElement } from "./elementToJSON";

/**
 * @example: <select name="cars" id="cars"><option value="volvo">Volvo</option></select> => {
    "nodeName": "select",
    "attributes": { "name": "cars", "id": "cars" },
    "children": [
      {
        "nodeName": "option",
        "attributes": { "value": "volvo" },
        "children": ["Volvo"]
      }
    ]
  }
 */
export function htmlToJSON(html: string): JSON_HTMLElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;

  return elementToJSON(root);
}
