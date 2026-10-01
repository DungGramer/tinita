import { numberRegex } from './patterns';

export function isNumber(str = '') {
  return numberRegex.test(str);
}
