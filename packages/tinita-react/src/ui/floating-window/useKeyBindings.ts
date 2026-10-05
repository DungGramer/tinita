'use client';

import { useEffect, useRef } from 'react';
import { parseKeyCombination, type KeyCombination } from 'tinita/converter/parseKeyCombination';

import { isApplePlatform } from './formatKeyCombination';

/** What a bound key can do. `maximize` toggles, matching the header control. */
export type FloatingWindowAction = 'close' | 'minimize' | 'maximize';

/**
 * Key combinations per action, in the syntax `parseKeyCombination` accepts -
 * `'Escape'`, `'Ctrl+M'`, `'Cmd+Shift+F'`. An array binds several to one action.
 */
export type FloatingWindowKeyBindings = Partial<
  Record<FloatingWindowAction, string | readonly string[]>
>;

/** A combination with no modifier and a single printable character. */
function isBarePrintable(combination: KeyCombination): boolean {
  return (
    !combination.ctrlKey &&
    !combination.shiftKey &&
    !combination.altKey &&
    !combination.metaKey &&
    [...combination.key].length === 1
  );
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function matches(event: KeyboardEvent, combination: KeyCombination): boolean {
  return (
    // Case-insensitive on purpose. `event.key` for `Ctrl+M` is `'m'`, lower case,
    // while a caller writes `'Ctrl+M'` - comparing exactly would never match.
    event.key.toLowerCase() === combination.key.toLowerCase() &&
    event.ctrlKey === combination.ctrlKey &&
    event.shiftKey === combination.shiftKey &&
    event.altKey === combination.altKey &&
    event.metaKey === combination.metaKey
  );
}

/**
 * Run an action when its bound key is pressed.
 *
 * **Nothing is bound by default.** `Escape` closes nothing until a caller asks for it.
 * A floating window is not a modal, so a hardcoded `Escape` would throw away whatever
 * the reader was doing in it, and no key is the right guess for every application.
 *
 * Parsing is `tinita/converter/parseKeyCombination`, so the accepted syntax and the
 * modifier aliases (`cmd`, `⌘`, `option`, `win`, ...) are one definition shared with
 * the rest of the packages rather than a second parser written here.
 *
 * ### Listener on `document`, gated by `enabled`
 *
 * On the window element it would do nothing until the reader had clicked inside, so a
 * freshly opened window would ignore its own shortcut and look broken. Caller passes
 * `enabled` - `FloatingWindow` passes `open && active`, so with several windows open
 * only the active one answers.
 *
 * ### A bare printable key is ignored while typing
 *
 * Binding `'m'` to minimize would otherwise minimise the window every time the letter
 * m was typed into an input inside it. Combinations with a modifier, and named keys
 * like `Escape` or `F2`, still fire in a field - they do not collide with typing. This
 * is not configurable because the alternative is never what a caller wants.
 *
 * ### Keys pressed inside a cross-origin iframe never arrive
 *
 * The same boundary the pointer shields exist for. Nothing can be done from this side.
 */
/**
 * Swap Control for Command, or the reverse, so one binding is right on both platforms.
 *
 * **Only when the caller did not already cover both.** If an action carries a
 * Control-only combination AND a Command-only one, they said what they meant for each
 * platform and nothing is touched. Owner's rule, 2026-10-05.
 *
 * This changes the LISTENER as well as the label, which is what makes it honest: bind
 * `'Ctrl+M'`, open it on a Mac, and `⌘M` is what fires - the tooltip is not translating
 * a key that does nothing. It is the `Mod` convention every editor uses (CodeMirror,
 * ProseMirror, Tiptap), applied automatically rather than through a keyword.
 *
 * The consequence, and it is the surprising half: on a Mac, a lone `'Ctrl+M'` becomes
 * Command, so Control+M no longer fires. That is what "đổi Ctrl thành Command" means -
 * a replacement, not an addition. Bind both explicitly to keep both.
 *
 * Left alone: a combination with neither modifier (`F11`, `Escape`, `Alt+M`), which has
 * nothing to swap, and one carrying both (`Ctrl+Cmd+M`), which already names them.
 */
function applyPlatformMapping(
  combinations: readonly KeyCombination[],
  apple: boolean
): KeyCombination[] {
  const hasControlOnly = combinations.some((c) => c.ctrlKey && !c.metaKey);
  const hasCommandOnly = combinations.some((c) => c.metaKey && !c.ctrlKey);
  if (hasControlOnly && hasCommandOnly) return [...combinations];

  return combinations.map((combination) => {
    // Equal means both set or neither - nothing to decide either way.
    if (combination.ctrlKey === combination.metaKey) return combination;

    return { ...combination, ctrlKey: !apple, metaKey: apple };
  });
}

/**
 * `keyBindings` as parsed combinations per action, mapped for the platform, with the
 * empty actions dropped.
 *
 * Called ONCE and the result handed to both the listener and the tooltips, so what a
 * control advertises and what it responds to cannot drift - two parses of the same prop
 * is how that happens.
 */
export function parseBindings(
  bindings: FloatingWindowKeyBindings | undefined,
  apple: boolean = isApplePlatform()
): Partial<Record<FloatingWindowAction, KeyCombination[]>> {
  const parsed: Partial<Record<FloatingWindowAction, KeyCombination[]>> = {};
  if (!bindings) return parsed;

  for (const [action, value] of Object.entries(bindings)) {
    if (!value) continue;
    const specs = typeof value === 'string' ? [value] : value;
    const combinations = specs.map((spec) => parseKeyCombination(spec));
    if (combinations.length === 0) continue;
    parsed[action as FloatingWindowAction] = applyPlatformMapping(combinations, apple);
  }

  return parsed;
}

export function useKeyBindings(
  parsed: Partial<Record<FloatingWindowAction, KeyCombination[]>>,
  enabled: boolean,
  run: (action: FloatingWindowAction) => void
): void {
  // Takes the ALREADY-PARSED map, not the raw prop. The component needs the same map
  // for its tooltips, and parsing twice is how a control ends up advertising a key it
  // does not answer - especially now that `parseBindings` also maps Control to Command
  // per platform.
  //
  // `run` in a ref, and the map keyed by its SERIALISATION: a caller writes
  // `keyBindings={{ close: 'Escape' }}` inline, so everything derived from it changes
  // identity every render. Depending on the object directly tears the listener down and
  // rebuilds it each time - the `Object.is` trap `useWindowSize` documents.
  const runRef = useRef(run);
  runRef.current = run;

  const parsedKey = JSON.stringify(parsed);

  useEffect(() => {
    if (!enabled) return;

    const flat = Object.entries(parsed).flatMap(([action, combinations]) =>
      combinations.map((combination) => ({
        action: action as FloatingWindowAction,
        combination,
      }))
    );
    if (flat.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const hit = flat.find((p) => matches(event, p.combination));
      if (!hit) return;
      if (isBarePrintable(hit.combination) && isEditable(event.target)) return;

      // The caller asked for this key, so the browser's or the host's own handling of
      // it should not also run.
      event.preventDefault();
      runRef.current(hit.action);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
    // `parsedKey`, not `parsed`: see the note above. `parsed` is read inside, and an
    // identical serialisation means identical content, so the listener stays put.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKey, enabled]);
}
