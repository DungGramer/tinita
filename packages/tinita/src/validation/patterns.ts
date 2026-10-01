/**
 * Shared patterns. Internal: not a published subpath, because exporting a RegExp
 * commits to its exact behaviour forever while leaving no room to fix it.
 */

/** TLD is `{2,}`, not `{2,4}`: the version this replaced rejected `.museum`, `.online` and `.technology`. */
export const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * No `g` flag, deliberately.
 *
 * `g` makes `.test()` advance `lastIndex` on a shared RegExp object, so the same
 * input alternates. Measured 2026-10-01 with the previous `/giu/`:
 * `hasVietnameseDiacritics('Hòa')` six times in a row returned
 * `true false true false true false`.
 */
export const vietnameseDiacriticsRegex =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/iu;

export const asciiLettersRegex = /^[a-zA-Z]+$/;

export const digitsRegex = /^\d+$/;
