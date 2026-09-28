import { describe, expect, it } from 'vitest';
import { variantAttributes } from '../../src/utils/variantAttributes';

describe('variantAttributes', () => {
  it('camelCase becomes kebab-case', () => {
    expect(variantAttributes({ borderRadius: 'md' })).toEqual({
      'data-border-radius': 'md',
    });
  });

  it('booleans render EXPLICITLY as true/false, the attribute is not dropped', () => {
    // Differing from Radix's convention (`data-disabled` present/absent) is
    // DELIBERATE: the CSS here has real rules for `[data-indicator='false']` and
    // `[data-show-arrow='false']`, and dropping the attribute when false would kill
    // them silently.
    expect(variantAttributes({ indicator: true, showArrow: false })).toEqual({
      'data-indicator': 'true',
      'data-show-arrow': 'false',
    });
  });

  it('undefined and null DROP the attribute entirely - meaning "follow the host"', () => {
    // This is the mechanism behind `theme`: left unset the component follows the
    // host's dark mode; passing 'light' or 'dark' forces it.
    expect(variantAttributes({ theme: undefined, other: null })).toEqual({});
  });

  it('numbers render, 0 included', () => {
    // `data-level={0}` must come out as `"0"`. With a falsy check, level 0 would
    // lose its attribute and `[data-level='0']` in FileTree.module.css would die.
    expect(variantAttributes({ level: 0, size: 12 })).toEqual({
      'data-level': '0',
      'data-size': '12',
    });
  });

  it('an empty string is still a value, not "no opinion"', () => {
    expect(variantAttributes({ state: '' })).toEqual({ 'data-state': '' });
  });

  it('consecutive capitals each get their own dash', () => {
    // Records the actual behaviour, not the desired one: `ariaLabelID` ->
    // `data-aria-label-i-d`. Not pretty, but no tinita prop is named that way, and
    // being smarter would mean guessing acronym boundaries - guessing wrong is
    // worse.
    expect(variantAttributes({ ariaLabelID: 'x' })).toEqual({
      'data-aria-label-i-d': 'x',
    });
  });

  it('touches nothing when the input is empty', () => {
    expect(variantAttributes({})).toEqual({});
  });
});
