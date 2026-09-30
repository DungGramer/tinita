import { MIME_TO_EXTENSION } from "../constant/mime_to_extension";
import { getFileNameParts } from "../file/getFileNameParts";

export function getMIMEFromFileName(filename: string) {
  const [, extension] = getFileNameParts(filename);

  for (const mimeType in MIME_TO_EXTENSION) {
    if (MIME_TO_EXTENSION[mimeType] === extension) {
      return mimeType; // Found a matching MIME type
    }
  }

  return null; // Return null if no matching MIME type is found
}
