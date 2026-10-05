import type { KeyCombination } from 'tinita/converter/parseKeyCombination';

/**
 * Apple's glyphs, in Apple's own order: Control, Option, Shift, Command.
 *
 * The order is not cosmetic - every Mac menu renders `⌃⌥⇧⌘` in that sequence, so a
 * different one reads as foreign on the platform it is written for.
 */
const APPLE = [
  ['ctrlKey', '⌃'],
  ['altKey', '⌥'],
  ['shiftKey', '⇧'],
  ['metaKey', '⌘'],
] as const;

/** Elsewhere, the conventional order and spelled-out names. */
const OTHER = [
  ['ctrlKey', 'Ctrl'],
  ['altKey', 'Alt'],
  ['shiftKey', 'Shift'],
  ['metaKey', 'Win'],
] as const;

/**
 * ARIA's own vocabulary, which is none of the above.
 *
 * `aria-keyshortcuts` requires the modifiers before the key; it does NOT prescribe an
 * order among them. This one is fixed so the attribute value is stable between
 * renders, and it follows the order used in the spec's own examples.
 */
const ARIA = [
  ['ctrlKey', 'Control'],
  ['altKey', 'Alt'],
  ['shiftKey', 'Shift'],
  ['metaKey', 'Meta'],
] as const;

/**
 * Guess whether the viewer is on an Apple keyboard layout.
 *
 * **Deliberately not `tinita-dom/validation/platform`'s `isMacOS()`**, which is the
 * canonical version of this guess and documents its own caveats. Importing it would
 * give `tinita-react` - a package that must survive SSR - an edge to a package marked
 * `browserOnly: true` in `contract.json`, whose modules the L2 SSR case SKIPS
 * entirely. CLAUDE.md states that every `tinita-dom` module must import cleanly
 * without a DOM, and measured 2026-10-05 nothing checks that. One duplicated regex is
 * the smaller cost. Recorded as debt.
 *
 * Wrong on an iPad reporting a Mac user-agent, which is harmless here: an iPad with a
 * keyboard does use ⌘. Wrong the other way on a spoofed agent, which costs a label.
 *
 * Both halves of the guard are live across the range `engines` allows. Measured
 * 2026-10-05 with `docker run node:<v>-alpine`:
 *
 * ```
 * node 18  typeof navigator === 'undefined'   -> the early return
 * node 20  typeof navigator === 'undefined'   -> the early return
 * node 22  navigator.userAgent "Node.js/22"   -> the regex, no match
 * node 24  navigator.userAgent "Node.js/24"   -> the regex, no match
 * ```
 *
 * Worth recording because on Node 22+ the early return never fires, so the guard
 * reads as dead code to anyone who checks on a recent Node and stops there.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;

  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
}

/** A single letter reads as a key only in upper case: `m` -> `M`. `F11` is left alone. */
const displayKey = (key: string): string => ([...key].length === 1 ? key.toUpperCase() : key);

/**
 * A combination as a viewer should read it: `'Ctrl + M'`, or `'⌘ + M'` on Apple.
 *
 * Separator is `' + '` even in the Apple style, where Apple itself writes `⌘M` with
 * nothing between. That is the owner's call, 2026-10-05; `' + '` is easier to read in
 * a tooltip than a glyph pressed against a letter.
 */
export function formatKeyCombination(
  combination: KeyCombination,
  apple = isApplePlatform()
): string {
  const parts = (apple ? APPLE : OTHER)
    .filter(([flag]) => combination[flag])
    .map(([, label]) => label);

  return [...parts, displayKey(combination.key)].join(' + ');
}

/**
 * `aria-keyshortcuts` value: ARIA's vocabulary, its `+` with no spaces, and every
 * alternative space-separated.
 *
 * All the bound combinations go in, not just the one on display: they all work, so a
 * screen reader should be able to announce any of them.
 */
export function toAriaKeyShortcuts(combinations: readonly KeyCombination[]): string {
  return combinations
    .map((combination) =>
      [
        ...ARIA.filter(([flag]) => combination[flag]).map(([, label]) => label),
        displayKey(combination.key),
      ].join('+')
    )
    .join(' ');
}

/**
 * The combination to SHOW, out of everything bound to one action.
 *
 * Picks by platform rather than always taking the first, because showing `⌘ + M` when
 * the key that actually fires is Control would be a lie. A caller binding
 * `['Ctrl+M', 'Cmd+M']` gets the Command one on Apple and the Control one elsewhere;
 * a caller binding only `'Ctrl+M'` gets `Ctrl + M` on every platform, which is the
 * truth.
 */
export function pickForPlatform(
  combinations: readonly KeyCombination[],
  apple = isApplePlatform()
): KeyCombination | null {
  if (combinations.length === 0) return null;
  const preferred = combinations.find((c) => (apple ? c.metaKey : c.ctrlKey));

  return preferred ?? combinations[0];
}
