import { MIME_TYPE_TABLE } from './mimeTypeTable';

export function mimeTypeToFileExtension(mime: keyof typeof MIME_TYPE_TABLE) {
  return MIME_TYPE_TABLE[mime] || mime?.split('/')?.pop?.()?.toLowerCase?.();
}
