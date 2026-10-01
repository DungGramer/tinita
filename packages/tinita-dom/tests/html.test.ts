import { describe, expect, it } from 'vitest';
import { elementToJson } from '../src/html/elementToJson';
import { htmlToJson } from '../src/html/htmlToJson';
import { isBlockLevelHtml } from '../src/html/isBlockLevelHtml';
import { jsonToHtml } from '../src/html/jsonToHtml';

describe('isBlockLevelHtml', () => {
  it('classifies the first element', () => {
    expect(isBlockLevelHtml('<p>a paragraph</p>')).toBe(true);
    expect(isBlockLevelHtml('<div><span>x</span></div>')).toBe(true);
    expect(isBlockLevelHtml('<span>inline</span>')).toBe(false);
    expect(isBlockLevelHtml('<em>x</em>')).toBe(false);
  });

  it('skips leading text and ignores later siblings', () => {
    expect(isBlockLevelHtml('  text <p>x</p>')).toBe(true);
    expect(isBlockLevelHtml('<span>x</span><p>y</p>')).toBe(false);
  });

  it('is false when there is no element at all', () => {
    expect(isBlockLevelHtml('just text')).toBe(false);
    expect(isBlockLevelHtml('')).toBe(false);
    expect(isBlockLevelHtml('   ')).toBe(false);
    expect(isBlockLevelHtml('<!-- comment -->')).toBe(false);
  });

  it('uses DOMParser, so no element is ever attached to this document', () => {
    // The real proof that DOMParser beats innerHTML needs a browser that loads
    // resources; jsdom does not, so an onerror payload is dormant here whichever
    // implementation is used (measured 2026-10-01). That proof is the L4 case.
    // What IS observable here: parsing leaves the live document untouched.
    const before = document.querySelectorAll('*').length;
    isBlockLevelHtml('<img src="x" onerror="globalThis.__pwned = 1">');
    expect(document.querySelectorAll('*').length).toBe(before);
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });

  it('throws on a non-string', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => isBlockLevelHtml(null)).toThrow(TypeError);
  });
});

describe('htmlToJson / jsonToHtml', () => {
  it('round-trips markup', () => {
    const markup =
      '<select id="cars"><option value="volvo">Volvo</option></select>';
    expect(jsonToHtml(htmlToJson(markup))).toBe(markup);
  });

  it('parses into the documented shape', () => {
    expect(htmlToJson('<p id="x">hi</p>')).toEqual({
      nodeName: 'p',
      attributes: { id: 'x' },
      children: ['hi'],
    });
  });

  it('throws a TypeError naming htmlToJson when there is no element', () => {
    expect(() => htmlToJson('just text')).toThrow(TypeError);
    expect(() => htmlToJson('')).toThrow(/htmlToJson/);
  });

  it('ESCAPES text and attributes, because the DOM serialiser does', () => {
    // Measured 2026-10-01. Asserted so nobody adds a redundant manual escape, and so
    // nobody removes the DOM round-trip in favour of string concatenation.
    expect(
      jsonToHtml({
        nodeName: 'div',
        attributes: {},
        children: ['<script>alert(1)</script>'],
      })
    ).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>');
    expect(
      jsonToHtml({
        nodeName: 'div',
        attributes: { title: '"><img src=x>' },
        children: [],
      })
    ).toContain('&quot;');
  });

  it('is FAITHFUL, so a hostile tree serialises to hostile markup', () => {
    // Not a bug to fix: a serialiser that silently dropped attributes would be worse.
    // Asserted so the JSDoc warning cannot drift away from the behaviour.
    expect(
      jsonToHtml({
        nodeName: 'img',
        attributes: { src: 'x', onerror: 'evil()' },
        children: [],
      })
    ).toBe('<img src="x" onerror="evil()">');
  });

  it('wraps the DOM DOMException for an invalid nodeName in a TypeError', () => {
    // The DOM throws `"a b" did not match the Name production`, which names neither
    // this function nor the offending node.
    expect(() =>
      jsonToHtml({ nodeName: 'a b', attributes: {}, children: [] })
    ).toThrow(TypeError);
    expect(() =>
      jsonToHtml({ nodeName: 'a b', attributes: {}, children: [] })
    ).toThrow(/not a valid HTML element name/);
  });

  it('throws on a non-object tree', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => jsonToHtml(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => jsonToHtml('<p>x</p>')).toThrow(TypeError);
  });

  it('handles a nested tree and missing optional fields', () => {
    expect(
      jsonToHtml({
        nodeName: 'ul',
        attributes: {},
        children: [{ nodeName: 'li', attributes: {}, children: ['a'] }],
      })
    ).toBe('<ul><li>a</li></ul>');
    // @ts-expect-error children and attributes omitted on purpose
    expect(jsonToHtml({ nodeName: 'br' })).toBe('<br>');
  });
});

describe('elementToJson', () => {
  it('lowercases nodeName and collects attributes', () => {
    const element = document.createElement('DIV');
    element.setAttribute('data-x', '1');
    expect(elementToJson(element)).toEqual({
      nodeName: 'div',
      attributes: { 'data-x': '1' },
      children: [],
    });
  });

  it('DROPS comments instead of mapping them to empty strings', () => {
    // The version this replaced pushed '' for every non-element, non-text node, so a
    // tree with comments compared unequal to the same markup without them.
    const withComment = htmlToJson('<p>a<!-- note -->b</p>');
    expect(withComment.children).toEqual(['a', 'b']);
    expect(withComment.children).not.toContain('');
  });

  it('keeps whitespace-only text nodes, faithfully', () => {
    expect(htmlToJson('<p>\n  x\n</p>').children).toEqual(['\n  x\n']);
  });

  it('throws a TypeError naming elementToJson on a non-element', () => {
    // The version this replaced threw `Cannot read properties of null` one line up.
    // @ts-expect-error deliberately wrong type
    expect(() => elementToJson(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => elementToJson(null)).toThrow(/elementToJson/);
  });

  it('serialises a template as empty, because its content is not in childNodes', () => {
    const template = document.createElement('template');
    template.innerHTML = '<p>hidden</p>';
    expect(elementToJson(template).children).toEqual([]);
  });
});
