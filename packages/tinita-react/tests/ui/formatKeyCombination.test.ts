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

  it('uses Apple glyphs on Apple', () => {
    expect(formatKeyCombination(parse('Cmd+M'), true)).toBe('⌘ + M');
    expect(formatKeyCombination(parse('Ctrl+M'), true)).toBe('⌃ + M');
    expect(formatKeyCombination(parse('Alt+M'), true)).toBe('⌥ + M');
    expect(formatKeyCombination(parse('Shift+M'), true)).toBe('⇧ + M');
  });

  // Every Mac menu renders ⌃⌥⇧⌘ in that sequence; another order reads as foreign.
  it("follows Apple's modifier order, not the order written", () => {
    expect(formatKeyCombination(parse('Cmd+Shift+Alt+Ctrl+K'), true)).toBe('⌃ + ⌥ + ⇧ + ⌘ + K');
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

    expect(formatKeyCombination(pickForPlatform(both, true)!, true)).toBe('⌘ + M');
    expect(formatKeyCombination(pickForPlatform(both, false)!, false)).toBe('Ctrl + M');
  });

  it('does NOT invent a Command binding that was never bound', () => {
    // Only Ctrl+M bound. On a Mac the key that fires is still Control, so the label
    // has to say so - `⌘ + M` here would be a lie.
    const onlyCtrl = [parse('Ctrl+M')];
    expect(formatKeyCombination(pickForPlatform(onlyCtrl, true)!, true)).toBe('⌃ + M');
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
    // Control, Alt, Shift, Meta - modifiers before the key, which is what the
    // attribute requires. The order AMONG modifiers is not prescribed by the spec;
    // this one is fixed so the value is stable, and it matches the spec's examples.
    expect(toAriaKeyShortcuts([parse('Cmd+Shift+K')])).toBe('Shift+Meta+K');
  });

  it('lists every bound alternative, because they all work', () => {
    expect(toAriaKeyShortcuts(['Ctrl+M', 'Cmd+M'].map(parse))).toBe('Control+M Meta+M');
  });
});
