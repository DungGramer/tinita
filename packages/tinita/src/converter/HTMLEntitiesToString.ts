import { HTMLEntitiesMap } from "../constant/HTML_entities_map";

type htmlEntitiesKey = keyof typeof HTMLEntitiesMap;

/**
 * @example decodeHTMLEntities('H&ograve;m nhĩ tr&aacute;i') -> Hòm nhĩ trái
 */
export function decodeHTMLEntities(str = '', exclude: htmlEntitiesKey[] = []) {
  if (typeof str !== 'string') {
    console.error('Input must be a string', str);
    return;
  }

  // Filter out values that are in the exclude array
  const entitiesToDecode = Object.keys(reverseHtmlEntities)
    .filter((key) => !exclude.includes(reverseHtmlEntities[key]))
    .join('|');

  // Create a regular expression from the filtered entity list
  const regex = new RegExp(`(${entitiesToDecode})`, 'gi');

  return str.replace(regex, (match) => reverseHtmlEntities[match] || match);
}

// Reverse the keys and values for decoding
const reverseHtmlEntities = Object.fromEntries(
  Object.entries(HTMLEntitiesMap).map(
    ([key, value]) =>
      [value, key] as [
        (typeof HTMLEntitiesMap)[htmlEntitiesKey],
        htmlEntitiesKey,
      ]
  )
);
