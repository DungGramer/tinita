import type { MIME_TYPE_TABLE } from './mimeTypeTable';
import { mimeTypeToFileExtension } from './mimeTypeToFileExtension';

/**
 * Convert Accept type input to regex for check extension file name
 * @example acceptAttributeToRegExp('image/png, .jpeg') => /(png|jpeg)$/i
 */
export function acceptAttributeToRegExp(acceptType: string) {
  if (!acceptType) return new RegExp('');

  const extensions = acceptType.split(', ').map((ext) => ext.trim());

  const regexPattern = extensions
    .map((ext) => {
      if (/\./.test(ext)) {
        return ext.replace(/\./g, '');
      }

      if (/\//.test(ext)) {
        return mimeTypeToFileExtension(ext as keyof typeof MIME_TYPE_TABLE);
      }

      return null;
    })
    .filter(Boolean)
    .join('|');

  return new RegExp(`(${regexPattern})$`, 'i');
}
