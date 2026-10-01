import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { jsxJoin } from '../../src/utils/jsxJoin';

const html = (node: React.ReactNode) => render(<div>{node}</div>).container.textContent;

describe('jsxJoin', () => {
  it('joins with a separator, the way Array.join joins strings', () => {
    expect(html(jsxJoin(['a', 'b', 'c'], ' | '))).toBe('a | b | c');
  });

  it('puts no separator before the first item or after the last', () => {
    expect(html(jsxJoin(['a'], ' | '))).toBe('a');
  });

  it('returns null for an empty array, so it drops straight into JSX', () => {
    expect(jsxJoin([], ' | ')).toBeNull();
  });

  it('drops null and undefined entries rather than joining around them', () => {
    expect(html(jsxJoin(['a', null, 'b', undefined], '-'))).toBe('a-b');
    expect(jsxJoin([null, undefined], '-')).toBeNull();
  });

  it('keeps 0 and empty string, which are nodes a caller means', () => {
    expect(html(jsxJoin([0, 1], '-'))).toBe('0-1');
  });

  it('accepts elements as items and as the separator', () => {
    expect(html(jsxJoin([<b key="a">a</b>, <b key="b">b</b>], <i>/</i>))).toBe('a/b');
  });

  it('logs no key warning - the version it replaced did, once per separator', () => {
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      render(<div>{jsxJoin(['a', 'b', 'c'], '-')}</div>);
    } finally {
      console.error = original;
    }
    expect(errors.filter((e) => String(e).includes('key'))).toEqual([]);
  });
});
