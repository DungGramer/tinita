import { HTMLEntitiesMap } from "../constant/HTML_entities_map";

/**
 * @example encodeToHTMLEntities('Hòm nhĩ trái') -> H&ograve;m nhĩ tr&aacute;i
 */
export function encodeToHTMLEntities(str: string, exclude: (keyof typeof HTMLEntitiesMap)[] = []) {
  // Filter out keys that are in the exclude array
  const charactersToEncode = Object.keys(HTMLEntitiesMap)
    .filter((key) => !exclude.includes(key))
    .join('');

  // Create a regular expression from the filtered character list
  const regex = new RegExp(`[${charactersToEncode}]`, 'gi');

  return str.replace(regex, function (match) {
    return HTMLEntitiesMap[match] || match;
  });
}
