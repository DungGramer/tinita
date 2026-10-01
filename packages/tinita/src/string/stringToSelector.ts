/**
 * Escape one CSS identifier, per the CSSOM `CSS.escape` algorithm.
 *
 * Implemented rather than delegated because `CSS` is a browser global and `tinita`
 * runs in Node too. `CSS.escape` is used when it exists so a browser gets the
 * engine's own implementation.
 */
function escapeIdentifier(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  let result = '';
  let index = 0;
  for (const character of value) {
    const code = character.codePointAt(0) as number;

    if (code === 0) {
      result += '�';
    } else if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) {
      result += `\\${code.toString(16)} `;
    } else if (index === 0 && code >= 0x30 && code <= 0x39) {
      // A leading digit must use the hex form; `\2` would be a literal '2'.
      result += `\\${code.toString(16)} `;
    } else if (
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      code === 0x5f ||
      code === 0x2d ||
      code > 0x7f
    ) {
      result += character;
    } else {
      result += `\\${character}`;
    }
    index += 1;
  }

  return result;
}

/**
 * A space-separated class list to a compound CSS selector.
 *
 * Each class becomes one `.name` and they are concatenated, so the result matches an
 * element carrying **all** of them. Runs of whitespace are treated as one separator.
 *
 * Every class is escaped with the CSSOM `CSS.escape` algorithm. The version this
 * replaced escaped only `[ ] ( )`, which produced wrong or invalid selectors for the
 * most common Tailwind shapes. Measured 2026-10-01:
 *
 * ```
 * input                 before                  after
 * hover:bg-red-500      .hover:bg-red-500       .hover\:bg-red-500
 *                       (parses as .hover + pseudo-class :bg-red-500)
 * w-1/2                 .w-1/2       invalid    .w-1\/2
 * mt-1.5                .mt-1.5      invalid    .mt-1\.5
 * 2xl:flex              .2xl:flex    invalid    .\32 xl\:flex
 * p-[calc(100%-2rem)]   % unescaped             .p-\[calc\(100\%-2rem\)\]
 * ```
 *
 * Returns `''` for an empty or whitespace-only string, so the result is never a bare
 * `'.'` that would throw inside `querySelector`.
 *
 * Throws `TypeError` on a non-string.
 *
 * @example
 * ```ts
 * stringToSelector('ant-table');               // '.ant-table'
 * stringToSelector('shrink h-[160px]');        // '.shrink.h-\\[160px\\]'
 * document.querySelector(stringToSelector('hover:bg-red-500'));
 * ```
 */
export function stringToSelector(value: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(
      `stringToSelector: expected a string, got ${typeof value}`
    );
  }

  const classes = value.split(/\s+/).filter((name) => name !== '');
  if (classes.length === 0) return '';

  return classes.map((name) => `.${escapeIdentifier(name)}`).join('');
}
