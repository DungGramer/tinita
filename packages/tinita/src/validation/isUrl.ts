import { urlRegex } from './patterns';

export const isUrl = (url: string): boolean => !!urlRegex.test(url);
