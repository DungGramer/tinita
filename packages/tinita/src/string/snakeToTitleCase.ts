/**
 * @example snakeToTitleCase('hello_world') // Hello World
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
