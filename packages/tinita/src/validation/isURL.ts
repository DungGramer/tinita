import { urlRegex } from "../regex";

export const isURL = (url: string): boolean => !!urlRegex.test(url);
