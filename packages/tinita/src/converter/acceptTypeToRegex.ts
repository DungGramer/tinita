import type { MIME_TO_EXTENSION } from "../constant/mime_to_extension";
import { getExtensionFromMIME } from "./MIMEToFileExtension";

/**
 * Convert Accept type input to regex for check extension file name
 * @example acceptTypeToRegex('image/png, .jpeg') => /(png|jpeg)$/i
 */
export function acceptTypeToRegex(acceptType: string) {
  if (!acceptType) return new RegExp('');

  const extensions = acceptType.split(', ').map((ext) => ext.trim());

  const regexPattern = extensions
    .map((ext) => {
      if (/\./.test(ext)) {
        return ext.replace(/\./g, '');
      }

      if (/\//.test(ext)) {
        return getExtensionFromMIME(ext as keyof typeof MIME_TO_EXTENSION);
      }

      return null;
    })
    .filter(Boolean)
    .join('|');

  return new RegExp(`(${regexPattern})$`, 'i');
}
