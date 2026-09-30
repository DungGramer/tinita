/**
 * Convert className to QuerySelector
 * @example stringToSelector('ant-table') => .ant-table
 * @example stringToSelector('shrink basis-[auto] h-[160px]') => .shrink.basis-\\[auto\\].h-\\[160px\\]
 */

export function stringToSelector(str: string) {
  if (!str) return '';

  str = str.replace(/ /g, '.');

  ['[', ']', '(', ')'].forEach((it) => {
    str = str.replace(new RegExp(`\\${it}`, 'g'), `\\${it}`);
  });

  return `.${str}`;
}
