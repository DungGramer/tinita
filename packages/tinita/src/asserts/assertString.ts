/**
 * Establishes: `value` is a `string`.
 *
 * Says nothing about length or content - an empty string passes. Use
 * `assertNonEmptyString` when empty is not acceptable.
 *
 * **This is not sanitisation.** It confirms the type and nothing else. A string that
 * passed here can still be hostile: `stringToSelector` needs CSS escaping and
 * `jsonToHtml` serialises whatever it is given. The `assert` prefix is easy to read
 * as "now it is safe", and it never means that.
 *
 * @param caller the public API that is rejecting the value, so the error names it.
 *   Use a stable API name - `'titleCase'`, `'html.encode'` - never dynamic data.
 * @param label the parameter name, so the error says which argument was wrong.
 *
 * @throws {TypeError} if `value` is not a string.
 *
 * @example
 * ```ts
 * export function titleCase(value: string): string {
 *   assertString(value, 'titleCase');
 *   // value: string from here on
 * }
 * ```
 */
export function assertString(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(
      `${caller}: ${label} must be a string, got ${typeof value}`
    );
  }
}
