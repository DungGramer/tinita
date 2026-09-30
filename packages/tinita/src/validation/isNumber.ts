import { numberRegex } from "../regex";

export function isNumber(str = '') {
  return numberRegex.test(str);
}
