/**
 * Lowercase the whole string, then uppercase its first character.
 *
 * Unlike `titleCase`, lowercasing is the point here, so it is not optional: a
 * sentence has exactly one capital at the front. The cost is the same as any
 * unconditional lowercase - `'NASA launched'` becomes `'Nasa launched'`.
 *
 * Leading and trailing whitespace is trimmed, because a sentence that starts with a
 * space has no first character to capitalise.
 *
 * Case conversion is locale-independent, so the result is the same on every machine.
 *
 * Returns `''` for an empty or whitespace-only string. Throws `TypeError` on a
 * non-string.
 *
 * @example
 * ```ts
 * sentenceCase('hello world');   // 'Hello world'
 * sentenceCase('  HELLO  ');     // 'Hello'
 * sentenceCase('NASA launched'); // 'Nasa launched'
 * ```
 */
export function sentenceCase(value: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`sentenceCase: expected a string, got ${typeof value}`);
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') return '';

  const [first, ...rest] = trimmed;

  return first.toUpperCase() + rest.join('');
}
