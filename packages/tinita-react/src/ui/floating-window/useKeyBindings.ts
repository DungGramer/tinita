'use client';

import { useEffect, useRef } from 'react';
import { parseKeyCombination, type KeyCombination } from 'tinita/converter/parseKeyCombination';

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
export function useKeyBindings(
  bindings: FloatingWindowKeyBindings | undefined,
  enabled: boolean,
  run: (action: FloatingWindowAction) => void
): void {
  // `run` in a ref, and the bindings keyed by their SERIALISATION.
  //
  // A caller writes `keyBindings={{ close: 'Escape' }}` and `onAction={() => ...}`
  // inline, so both change identity on every render. Depending on them directly tears
  // the listener down and rebuilds it every render - the same `Object.is` trap
  // `useWindowSize` documents, where a fresh object each check means "always changed".
  const runRef = useRef(run);
  runRef.current = run;

  const bindingKey = JSON.stringify(bindings ?? null);

  useEffect(() => {
    if (!enabled || !bindings) return;

    const parsed: { action: FloatingWindowAction; combination: KeyCombination }[] = [];
    for (const [action, value] of Object.entries(bindings)) {
      if (!value) continue;
      for (const spec of typeof value === 'string' ? [value] : value) {
        parsed.push({
          action: action as FloatingWindowAction,
          combination: parseKeyCombination(spec),
        });
      }
    }
    if (parsed.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const hit = parsed.find((p) => matches(event, p.combination));
      if (!hit) return;
      if (isBarePrintable(hit.combination) && isEditable(event.target)) return;

      // The caller asked for this key, so the browser's or the host's own handling of
      // it should not also run.
      event.preventDefault();
      runRef.current(hit.action);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
    // `bindingKey`, not `bindings`: see the note above. `bindings` is read inside, and
    // an identical serialisation means identical content, so the listener stays put.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingKey, enabled]);
}
