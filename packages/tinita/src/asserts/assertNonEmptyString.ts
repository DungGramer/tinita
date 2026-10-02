/**
 * Establishes: `value` is a `string` with at least one character.
 *
 * **Does not trim.** `' '` is a non-empty string and passes. Trimming would be a
 * silent change to the caller's data, and §4 of the package's validation rules says
 * not to do it unless trimming is part of the API contract. Call `.trim()` first if
 * whitespace-only should be refused.
 *
 * The two failures report differently - not a string, versus empty - because
 * "`name` must be a non-empty string, got object" and "got an empty string" send the
 * caller to different bugs.
 *
 * @throws {TypeError} if `value` is not a string, or is `''`.
 *
 * @example
 * ```ts
 * assertNonEmptyString(fileName, 'downloadBlob', 'fileName');
 * ```
 */
export function assertNonEmptyString(
  value: unknown,
  caller: string,
  label = 'value'
): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(
      `${caller}: ${label} must be a non-empty string, got ${typeof value}`
    );
  }
  if (value === '') {
    throw new TypeError(
      `${caller}: ${label} must be a non-empty string, got an empty string`
    );
  }
}
