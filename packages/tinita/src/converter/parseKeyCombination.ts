export interface KeyCombination {
  /** The non-modifier key, exactly as written. */
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/**
 * Token aliases, matched whole and case-insensitively.
 *
 * Whole-token matching, not a substring regex: the version this replaced built
 * `new RegExp('alt|option|⌥', 'ig')` and tested it against each token, so a key
 * named `Salt` registered as Alt.
 */
const MODIFIER_ALIASES: Readonly<
  Record<keyof Omit<KeyCombination, 'key'>, readonly string[]>
> = {
  ctrlKey: ['ctrl', 'control', '⌃'],
  shiftKey: ['shift', '⇧'],
  altKey: ['alt', 'option', 'opt', '⌥'],
  metaKey: ['meta', 'cmd', 'command', 'win', 'super', '⌘', '⊞'],
};

const ALIAS_TO_FLAG = new Map<string, keyof Omit<KeyCombination, 'key'>>(
  Object.entries(MODIFIER_ALIASES).flatMap(([flag, aliases]) =>
    aliases.map((alias) => [alias, flag as keyof Omit<KeyCombination, 'key'>])
  )
);

/**
 * Parse a hotkey string like `'Ctrl+Shift+A'` into `KeyboardEvent` flags.
 *
 * The last `+`-separated token is the key; every token before it must be a modifier.
 * Tokens are trimmed and matched case-insensitively against the aliases below, whole
 * token only:
 *
 * ```
 * ctrlKey   ctrl control ⌃
 * shiftKey  shift ⇧
 * altKey    alt option opt ⌥
 * metaKey   meta cmd command win super ⌘ ⊞
 * ```
 *
 * **Always returns all five fields.** The version this replaced returned `{ key }`
 * alone when there was no `+`, so the shape depended on the input and every caller
 * needed a check - against the repo's "one function, one return type" rule.
 *
 * Fixes a defect that made the function unusable for its main job. Measured
 * 2026-10-01, the version this replaced reassigned all four flags on every loop
 * iteration, so only the **last** modifier survived:
 *
 * ```
 * 'Ctrl+Shift+A'      ->  ctrlKey false   Ctrl lost
 * 'Cmd+Alt+Shift+K'   ->  only shiftKey   Cmd and Alt both lost
 * 'Ctrl+Ctrl+A'       ->  all false       the `g` flag advanced lastIndex
 * ```
 *
 * To express `+` itself as the key, write it last: `'Ctrl++'`.
 *
 * @throws {TypeError} if `value` is not a string, is empty, or contains a token
 *   before the key that is not a known modifier. An unknown modifier is refused
 *   rather than ignored - silently dropping `Hyper` would report a combination the
 *   caller did not ask for.
 *
 * @example
 * ```ts
 * parseKeyCombination('A');
 * // { key: 'A', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }
 * parseKeyCombination('Ctrl+Shift+A');
 * // { key: 'A', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false }
 * parseKeyCombination('⌘+⌥+K');
 * // { key: 'K', ctrlKey: false, shiftKey: false, altKey: true, metaKey: true }
 * ```
 */
export function parseKeyCombination(value: string): KeyCombination {
  if (typeof value !== 'string') {
    throw new TypeError(
      `parseKeyCombination: expected a string, got ${typeof value}`
    );
  }
  if (value.trim() === '') {
    throw new TypeError(
      'parseKeyCombination: expected a key combination, got an empty string'
    );
  }

  // A trailing '+' is the key itself: 'Ctrl++' means Ctrl plus the '+' key. Splitting
  // naively gives ['Ctrl', '', ''], so `pop` would take '' as the key and leave a
  // stray '' looking like an unknown modifier.
  const trailingPlusIsKey =
    value.trim().endsWith('+') && value.trim().length > 1;
  const body = trailingPlusIsKey ? value.trim().slice(0, -1) : value;

  const tokens = body.split('+').map((token) => token.trim());
  const key = trailingPlusIsKey ? '+' : (tokens.pop() as string);
  if (trailingPlusIsKey && tokens[tokens.length - 1] === '') tokens.pop();

  const result: KeyCombination = {
    key,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };

  for (const token of tokens) {
    // An empty token means a doubled '+', except the trailing '+' that `pop` already
    // took as the key: 'Ctrl++' leaves tokens ['Ctrl'] and key '+'.
    const flag = ALIAS_TO_FLAG.get(token.toLowerCase());
    if (!flag) {
      throw new TypeError(
        `parseKeyCombination: "${token}" in "${value}" is not a known modifier. Known: ${[...ALIAS_TO_FLAG.keys()].join(', ')}`
      );
    }
    result[flag] = true;
  }

  return result;
}
