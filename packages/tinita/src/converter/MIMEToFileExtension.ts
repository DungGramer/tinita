import { MIME_TO_EXTENSION } from '../constant/mime_to_extension';

export function getExtensionFromMIME(mime: keyof typeof MIME_TO_EXTENSION) {
  return MIME_TO_EXTENSION[mime] || mime?.split('/')?.pop?.()?.toLowerCase?.();
}
