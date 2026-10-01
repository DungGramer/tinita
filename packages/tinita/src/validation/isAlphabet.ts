import { alphabetRegex } from './patterns';

export function isAlphabet(str = '') {
  return alphabetRegex.test(str);
}
