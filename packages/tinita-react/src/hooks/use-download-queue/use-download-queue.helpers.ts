import type { QueueInput } from './use-download-queue.types';
import type { DownloadFromUrlOptions } from 'tinita/download';

export function normalizeInput(input: QueueInput): { url: string | URL; options?: DownloadFromUrlOptions } {
  if (typeof input === 'string' || input instanceof URL) {
    return { url: input };
  }
  return input;
}
