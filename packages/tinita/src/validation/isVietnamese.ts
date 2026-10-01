import { vietnameseRegex } from './patterns';

export function isVietnamese(searchText = '') {
  return vietnameseRegex.test(searchText);
}
