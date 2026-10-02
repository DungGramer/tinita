import { afterEach, describe, expect, it, vi } from 'vitest';
import * as scrollbarModule from '../src/dimension/getScrollbarSize';
import { downloadBlob } from '../src/file/downloadBlob';
import { resizeImage } from '../src/image/resizeImage';
import { cookieJar } from '../src/storage/cookieJar';
import { setCssVariables } from '../src/style/setCssVariables';

const { getScrollbarSize } = scrollbarModule;

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
});

describe('setCssVariables', () => {
  it('writes custom properties as inline style', () => {
    setCssVariables({ 'footer-height': '64px' });
    expect(
      document.documentElement.style.getPropertyValue('--footer-height')
    ).toBe('64px');
  });

  it('accepts a key with or without the -- prefix, without doubling it', () => {
    setCssVariables({ '--gap': '8px' });
    expect(document.documentElement.style.getPropertyValue('--gap')).toBe(
      '8px'
    );
    expect(document.documentElement.style.getPropertyValue('----gap')).toBe('');
  });

  it('writes a number as-is, which is right for unitless and wrong for lengths', () => {
    // Documented rather than guessed at: adding 'px' automatically would be wrong
    // for z-index and opacity.
    setCssVariables({ 'z-top': 100 });
    expect(document.documentElement.style.getPropertyValue('--z-top')).toBe(
      '100'
    );
  });

  it('REMOVES on null instead of storing the string "null"', () => {
    setCssVariables({ gap: '8px' });
    setCssVariables({ gap: null });
    expect(document.documentElement.style.getPropertyValue('--gap')).toBe('');
  });

  it('scopes to the element it is given', () => {
    const panel = document.createElement('div');
    setCssVariables({ gap: '4px' }, panel);
    expect(panel.style.getPropertyValue('--gap')).toBe('4px');
    expect(document.documentElement.style.getPropertyValue('--gap')).toBe('');
  });

  it('THROWS on an invalid name, which setProperty would ignore silently', () => {
    // Without this check a typo such as 'footer height' reads as a successful write.
    for (const name of ['footer height', '', 'a;b', 'a:b', 'a{b']) {
      expect(() => setCssVariables({ [name]: '1px' }), name).toThrow(TypeError);
    }
  });

  it('throws on a non-object and on a target with no style', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => setCssVariables(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => setCssVariables({ a: '1' }, {})).toThrow(TypeError);
  });
});

describe('downloadBlob', () => {
  it('clicks a detached anchor carrying the file name', () => {
    const clicks: HTMLAnchorElement[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push(this);
      });

    downloadBlob(new Blob(['a,b'], { type: 'text/csv' }), 'report.csv');

    expect(click).toHaveBeenCalledOnce();
    expect(clicks[0]?.download).toBe('report.csv');
    expect(clicks[0]?.href.startsWith('blob:')).toBe(true);
    // Never inserted, so it leaves no trace and no layout effect.
    expect(clicks[0]?.isConnected).toBe(false);
  });

  it('revokes the object URL after the configured delay, not on a magic 100ms', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );

    downloadBlob(new Blob(['x']), 'a.txt', { revokeAfterMs: 5000 });

    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('never revokes when asked not to', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );

    downloadBlob(new Blob(['x']), 'a.txt', {
      revokeAfterMs: Number.POSITIVE_INFINITY,
    });

    vi.advanceTimersByTime(10_000_000);
    expect(revoke).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('returns undefined - nothing about the outcome is observable', () => {
    // The version this replaced returned the <a> element, which told the caller
    // nothing. The browser decides whether it saves, opens a dialog, or renders.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    );
    expect(downloadBlob(new Blob(['x']), 'a.txt')).toBeUndefined();
  });

  it('throws on a non-Blob and on an empty file name', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => downloadBlob('raw text', 'a.txt')).toThrow(TypeError);
    expect(() => downloadBlob(new Blob(['x']), '')).toThrow(TypeError);
  });
});

describe('getScrollbarSize', () => {
  it('returns a [width, height] pair of numbers', () => {
    const size = getScrollbarSize();
    expect(size).toHaveLength(2);
    expect(size.every((value) => typeof value === 'number')).toBe(true);
  });

  it('leaves the document exactly as it found it', () => {
    const before = document.body.childNodes.length;
    getScrollbarSize();
    expect(document.body.childNodes.length).toBe(before);
  });

  it('has no default export - the package is named exports only', () => {
    // Checked through the namespace object because a default import of a module
    // without one is a type error, which is exactly the guarantee being asserted.
    expect('default' in scrollbarModule).toBe(false);
    expect(Object.keys(scrollbarModule)).toEqual(['getScrollbarSize']);
  });

  it('measures zero where there is no layout engine, and the JSDoc says so', () => {
    // jsdom reports offsetHeight 0 for everything (measured 2026-10-01), so this can
    // only assert the shape. The real value is observable in the L4 browser lab.
    expect(getScrollbarSize()).toEqual([0, 0]);
  });
});

describe('validation gaps closed 2026-10-02', () => {
  it('resizeImage REFUSES a quality outside 0..1, with RangeError', () => {
    // Was unvalidated, and silently: the spec says toDataURL ignores a quality
    // outside 0..1 and uses its default, so `quality: 1.5` returned a
    // default-quality image and reported nothing.
    //
    // RangeError because 0..1 is an explicitly bounded interval - the one place in
    // the repo that earns it. The type problem stays a TypeError.
    expect(() =>
      resizeImage('x', { type: 'image/jpeg', quality: 1.5 })
    ).toThrow(RangeError);
    expect(() =>
      resizeImage('x', { type: 'image/jpeg', quality: -0.1 })
    ).toThrow(RangeError);
    expect(() =>
      // @ts-expect-error deliberately wrong type
      resizeImage('x', { type: 'image/jpeg', quality: '0.8' })
    ).toThrow(TypeError);
  });

  it('resizeImage ACCEPTS the boundary values and omission', () => {
    for (const quality of [0, 1, 0.5, undefined]) {
      expect(
        () => resizeImage('x', { type: 'image/jpeg', quality }),
        String(quality)
      ).not.toThrow();
    }
  });

  it('resizeImage does NOT refuse a bad quality for PNG, which ignores it', () => {
    // The spec says toDataURL ignores quality for image/png, so refusing there would
    // reject a perfectly valid call.
    expect(() =>
      resizeImage('x', { type: 'image/png', quality: 1.5 })
    ).not.toThrow();
    expect(() => resizeImage('x', { quality: 99 })).not.toThrow();
  });

  it('cookieJar REFUSES a maxAge that would silently drop the whole cookie', () => {
    // Math.floor(NaN) is NaN, so `Max-Age=NaN` is unparseable and the browser
    // discards the cookie entirely. `set` returns void, so a session or CSRF cookie
    // simply never got written.
    for (const maxAge of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => cookieJar.set('k', 'v', { maxAge }), String(maxAge)).toThrow(
        TypeError
      );
    }
  });

  it('cookieJar accepts 0, which means expire now', () => {
    expect(() => cookieJar.set('k', 'v', { maxAge: 0 })).not.toThrow();
    expect(() => cookieJar.set('k', 'v', { maxAge: 300 })).not.toThrow();
    cookieJar.remove('k');
  });

  it('maxAge is TypeError, not RangeError - there is no upper bound to exceed', () => {
    // How long a cookie lives is the caller's business. The invariant is only
    // "non-negative integer of seconds", which is a value contract.
    expect(() => cookieJar.set('k', 'v', { maxAge: -1 })).not.toThrow(
      RangeError
    );
  });
});
