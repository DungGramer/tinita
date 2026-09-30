import { vietnameseRegex } from "../regex";

export function isVietnamese(searchText = '') {
  return vietnameseRegex.test(searchText);
}
