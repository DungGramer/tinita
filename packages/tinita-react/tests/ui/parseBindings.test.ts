import { describe, expect, it } from 'vitest';

import { parseBindings } from '../../src/ui/floating-window/useKeyBindings';

const shape = (combination: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}) =>
  [
    combination.ctrlKey && 'ctrl',
    combination.altKey && 'alt',
    combination.shiftKey && 'shift',
    combination.metaKey && 'meta',
    combination.key,
  ]
    .filter(Boolean)
    .join('+');

const mapped = (bindings: Parameters<typeof parseBindings>[0], apple: boolean) =>
  Object.fromEntries(
    Object.entries(parseBindings(bindings, apple)).map(([action, list]) => [
      action,
      list.map(shape),
    ])
  );

/**
 * Owner's rule, 2026-10-05: covered both platforms yourself and nothing is touched;
 * covered one and it is swapped to match the platform - the LISTENER as well as the
 * label, which is what makes the label honest.
 */
describe('parseBindings - the Control/Command mapping', () => {
  it('swaps a lone Control binding to Command on Apple', () => {
    expect(mapped({ minimize: 'Ctrl+M' }, true)).toEqual({
      minimize: ['meta+M'],
    });
  });

  it('swaps a lone Command binding to Control away from Apple', () => {
    expect(mapped({ minimize: 'Cmd+M' }, false)).toEqual({
      minimize: ['ctrl+M'],
    });
  });

  it('leaves a lone binding alone on its own platform', () => {
    expect(mapped({ minimize: 'Ctrl+M' }, false)).toEqual({
      minimize: ['ctrl+M'],
    });
    expect(mapped({ minimize: 'Cmd+M' }, true)).toEqual({
      minimize: ['meta+M'],
    });
  });

  // The clause that stops the mapping being a nuisance: say what you mean for each
  // platform and it is taken literally.
  it('maps NOTHING when both platforms were covered explicitly', () => {
    expect(mapped({ minimize: ['Ctrl+M', 'Cmd+M'] }, true)).toEqual({
      minimize: ['ctrl+M', 'meta+M'],
    });
    expect(mapped({ minimize: ['Ctrl+M', 'Cmd+M'] }, false)).toEqual({
      minimize: ['ctrl+M', 'meta+M'],
    });
  });

  it('counts "both covered" per action, not across the whole map', () => {
    // `close` named both, `minimize` named one - only `minimize` is mapped.
    expect(mapped({ close: ['Ctrl+W', 'Cmd+W'], minimize: 'Ctrl+M' }, true)).toEqual({
      close: ['ctrl+W', 'meta+W'],
      minimize: ['meta+M'],
    });
  });

  it('keeps the other modifiers while swapping', () => {
    expect(mapped({ minimize: 'Ctrl+Shift+Alt+M' }, true)).toEqual({
      minimize: ['alt+shift+meta+M'],
    });
  });

  it('leaves a combination with neither modifier untouched', () => {
    expect(mapped({ maximize: 'F11', close: 'Escape', minimize: 'Alt+M' }, true)).toEqual({
      maximize: ['F11'],
      close: ['Escape'],
      minimize: ['alt+M'],
    });
  });

  it('leaves a combination naming BOTH modifiers untouched', () => {
    // `Ctrl+Cmd+M` already says both; there is nothing to decide.
    expect(mapped({ minimize: 'Ctrl+Cmd+M' }, true)).toEqual({
      minimize: ['ctrl+meta+M'],
    });
    expect(mapped({ minimize: 'Ctrl+Cmd+M' }, false)).toEqual({
      minimize: ['ctrl+meta+M'],
    });
  });

  it('drops an action with no binding, and handles no bindings at all', () => {
    expect(parseBindings(undefined, true)).toEqual({});
    expect(mapped({ minimize: [] }, true)).toEqual({});
  });
});
