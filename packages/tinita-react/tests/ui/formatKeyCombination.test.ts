import { parseKeyCombination } from 'tinita/converter/parseKeyCombination';
import { describe, expect, it } from 'vitest';

import {
  formatKeyCombination,
  pickForPlatform,
  toAriaKeyShortcuts,
} from '../../src/ui/floating-window/formatKeyCombination';

const parse = (spec: string) => parseKeyCombination(spec);

describe('formatKeyCombination', () => {
  it('spells modifiers out away from Apple', () => {
    expect(formatKeyCombination(parse('Ctrl+M'), false)).toBe('Ctrl + M');
    expect(formatKeyCombination(parse('Alt+Shift+K'), false)).toBe('Alt + Shift + K');
    expect(formatKeyCombination(parse('Win+E'), false)).toBe('Win + E');
  });

  it('uses Apple glyphs, concatenated, on Apple', () => {
    expect(formatKeyCombination(parse('Cmd+M'), true)).toBe('⌘M');
    expect(formatKeyCombination(parse('Ctrl+M'), true)).toBe('⌃M');
    expect(formatKeyCombination(parse('Alt+M'), true)).toBe('⌥M');
    expect(formatKeyCombination(parse('Shift+M'), true)).toBe('⇧M');
  });

  // Dropping the separator alone would give `⌘Escape` - a glyph pressed against a
  // word, which is not Apple style at all. macOS writes `⌥⌘⎋`.
  it('maps the named keys to their Apple glyph', () => {
    expect(formatKeyCombination(parse('Cmd+Escape'), true)).toBe('⌘⎋');
    expect(formatKeyCombination(parse('Alt+Cmd+Escape'), true)).toBe('⌥⌘⎋');
    expect(formatKeyCombination(parse('Cmd+Enter'), true)).toBe('⌘↩');
    expect(formatKeyCombination(parse('Cmd+ArrowUp'), true)).toBe('⌘↑');
    expect(formatKeyCombination(parse('Cmd+Backspace'), true)).toBe('⌘⌫');
  });

  it('matches a key name case-insensitively', () => {
    // `parseKeyCombination` keeps the key exactly as written, so both spellings have
    // to reach the same glyph.
    expect(formatKeyCombination(parse('Cmd+esc'), true)).toBe('⌘⎋');
    expect(formatKeyCombination(parse('Cmd+ESCAPE'), true)).toBe('⌘⎋');
  });

  it('leaves a key with no Apple glyph exactly as written', () => {
    // macOS does the same: function keys stay F-keys, Space stays the word.
    expect(formatKeyCombination(parse('Cmd+F11'), true)).toBe('⌘F11');
    expect(formatKeyCombination(parse('Cmd+Space'), true)).toBe('⌘Space');
  });

  it('never uses a glyph away from Apple', () => {
    expect(formatKeyCombination(parse('Ctrl+Escape'), false)).toBe('Ctrl + Escape');
    expect(formatKeyCombination(parse('Ctrl+ArrowUp'), false)).toBe('Ctrl + ArrowUp');
  });

  // Every Mac menu renders ⌃⌥⇧⌘ in that sequence; another order reads as foreign.
  it("follows Apple's modifier order, not the order written", () => {
    expect(formatKeyCombination(parse('Cmd+Shift+Alt+Ctrl+K'), true)).toBe('⌃⌥⇧⌘K');
  });

  it('upper-cases a single letter and leaves a named key alone', () => {
    expect(formatKeyCombination(parse('m'), false)).toBe('M');
    expect(formatKeyCombination(parse('Escape'), false)).toBe('Escape');
    expect(formatKeyCombination(parse('F11'), false)).toBe('F11');
  });
});

describe('pickForPlatform', () => {
  // The whole point: a tooltip must never show a combination that does not fire.
  it('shows the Command one on Apple and the Control one elsewhere', () => {
    const both = ['Ctrl+M', 'Cmd+M'].map(parse);

    expect(formatKeyCombination(pickForPlatform(both, true)!, true)).toBe('⌘M');
    expect(formatKeyCombination(pickForPlatform(both, false)!, false)).toBe('Ctrl + M');
  });

  // `pickForPlatform` sees combinations that `parseBindings` has ALREADY mapped, so in
  // the component this case does not arise: a lone Control binding has become Command
  // before it gets here. Kept as a unit on the raw function, which still picks nothing
  // it was not given.
  it('picks nothing it was not given', () => {
    const onlyCtrl = [parse('Ctrl+M')];
    expect(formatKeyCombination(pickForPlatform(onlyCtrl, true)!, true)).toBe('⌃M');
  });

  it('falls back to the first when no combination matches the platform', () => {
    const noModifier = [parse('F11'), parse('F12')];
    expect(pickForPlatform(noModifier, true)?.key).toBe('F11');
    expect(pickForPlatform(noModifier, false)?.key).toBe('F11');
  });

  it('returns null for nothing bound', () => {
    expect(pickForPlatform([], true)).toBeNull();
  });
});

describe('toAriaKeyShortcuts', () => {
  // ARIA has its own vocabulary and its own syntax: `Control`, not `Ctrl` or `⌃`;
  // `+` with no spaces; alternatives separated by a space.
  it("uses ARIA's names and syntax, not the display ones", () => {
    expect(toAriaKeyShortcuts([parse('Ctrl+M')])).toBe('Control+M');
    // A glyph here would be invalid: ARIA wants the key's name.
    expect(toAriaKeyShortcuts([parse('Cmd+Escape')])).toBe('Meta+Escape');
    // Control, Alt, Shift, Meta - modifiers before the key, which is what the
    // attribute requires. The order AMONG modifiers is not prescribed by the spec;
    // this one is fixed so the value is stable, and it matches the spec's examples.
    expect(toAriaKeyShortcuts([parse('Cmd+Shift+K')])).toBe('Shift+Meta+K');
  });

  it('lists every bound alternative, because they all work', () => {
    expect(toAriaKeyShortcuts(['Ctrl+M', 'Cmd+M'].map(parse))).toBe('Control+M Meta+M');
  });
});
