import { alphabetRegex } from "../regex";

export function isAlphabet(str = '') {
  return alphabetRegex.test(str);
}
