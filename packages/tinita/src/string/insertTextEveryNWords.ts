import { assertInteger } from '../asserts/assertInteger';
import { assertString } from '../asserts/assertString';

/**
 * Insert `separator` after every `every` words.
 *
 * Words are split on single spaces, matching the way the text was written. Nothing
 * is inserted after the last group, so the result never ends with a stray separator.
 *
 * The default separator is `'\n'`, not `'<br>'`. The version this replaced defaulted
 * to `'<br>'`, which made a plain string function emit HTML: the result looked like
 * text but was only correct when passed through `innerHTML`. Pass `'<br>'`
 * explicitly when the caller knows it is building markup - and then it is their job
 * to escape the surrounding text.
 *
 * Returns `value` unchanged when `every < 1` or when there are no more than `every`
 * words, so there is nothing to break up.
 *
 * Throws `TypeError` if `value` or `separator` is not a string, or if `every` is not
 * an integer.
 *
 * @example
 * ```ts
 * insertTextEveryNWords('This is a long title', 2);
 * // 'This is\na long\ntitle'
 * insertTextEveryNWords('This is a long title', 2, '<br>');
 * // 'This is <br> a long <br> title'
 * ```
 */
export function insertTextEveryNWords(
  value: string,
  every = 2,
  separator = '\n'
): string {
  assertString(value, 'insertTextEveryNWords');
  assertString(separator, 'insertTextEveryNWords', 'separator');
  assertInteger(every, 'insertTextEveryNWords', 'every');

  const words = value.split(' ');
  if (every < 1 || words.length <= every) return value;

  const groups: string[] = [];
  for (let index = 0; index < words.length; index += every) {
    groups.push(words.slice(index, index + every).join(' '));
  }

  return groups.join(separator);
}
