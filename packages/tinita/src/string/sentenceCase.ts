/**
 * @example sentenceCase('hello world') // Hello world
 */
export function sentenceCase(str: string) {
  if (!str) return '';
  const lowered = str.toLowerCase().trim();

  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}
