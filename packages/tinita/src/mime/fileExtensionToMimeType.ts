import { MIME_TYPE_TABLE } from './mimeTypeTable';
import { getFileNameParts } from '../file/getFileNameParts';

export function fileExtensionToMimeType(filename: string) {
  const [, extension] = getFileNameParts(filename);

  for (const mimeType in MIME_TYPE_TABLE) {
    if (MIME_TYPE_TABLE[mimeType] === extension) {
      return mimeType; // Found a matching MIME type
    }
  }

  return null; // Return null if no matching MIME type is found
}
