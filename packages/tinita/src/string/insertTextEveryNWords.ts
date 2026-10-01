/**
 * @example
 * insertTextEveryNWords('This is a long title', 2, '<br>')
 * // 'This is <br> a long <br> title'
 */
export function insertTextEveryNWords(
  string = '',
  size = 2,
  additionText = '<br>'
) {
  const words = string.split(' ');

  if (size <= 0 || words.length <= size) return string;

  for (let i = size; i < words.length; i += size + 1) {
    words.splice(i, 0, additionText);
  }

  return words.join(' ');
}
