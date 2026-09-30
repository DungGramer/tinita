
/**
 * @example titleCase('hello world') // Hello World
 */
export function titleCase(str: string) {
  if (!str) return '';

  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * @example sentenceCase('hello world') // Hello world
 */
export function sentenceCase(str: string) {
  if (!str) return '';
  str = str.toLowerCase().trim();

  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * @example: hello_world => Hello World
 */
export function snakeToTitleCase(snakeStr: string): string {
  if (typeof snakeStr !== 'string') {
    console.error('typeof snakeStr is not a string', snakeStr);
    return snakeStr;
  }
  const words = snakeStr.split('_');

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @example: insertTextAfterWords("This is a long title", 2, '<br>') => "This is <br> a long <br> title"
 */
export function insertTextAfterWords(
  string = '',
  size = 2,
  additionText = '<br>'
) {
  const words = string.split(' ');

  // Check if the size is valid
  if (size <= 0 || words.length <= size) return string;

  // Iterate over the words and add the additionText
  for (let i = size; i < words.length; i += size + 1) {
    words.splice(i, 0, additionText);
  }

  return words.join(' ');
}

export function removeEmptySpace(str = '') {
  return str.replace(/\s+/g, ' ');
}
