import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookieJar } from '../src/storage/cookieJar';
import { createJsonStore } from '../src/storage/createJsonStore';
import { localStorageJson } from '../src/storage/localStorageJson';
import { sessionStorageJson } from '../src/storage/sessionStorageJson';

describe.each([
  ['localStorageJson', localStorageJson, () => localStorage],
  ['sessionStorageJson', sessionStorageJson, () => sessionStorage],
])('%s', (_, store, area) => {
  beforeEach(() => area().clear());

  it('round-trips JSON', () => {
    store.set('k', { a: 1, b: ['x'] });
    expect(store.get('k', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('returns the fallback for an absent key', () => {
    expect(store.get('missing', 42)).toBe(42);
  });

  it('does NOT throw on a value another library wrote', () => {
    // Measured on the version this replaced: JSON.parse with no try, so one foreign
    // value on a shared key made `get` throw where its own `defaultValue` parameter
    // promised a fallback.
    area().setItem('k', 'not json at all');
    expect(() => store.get('k', 42)).not.toThrow();
    expect(store.get('k', 42)).toBe(42);
  });

  it('stores 0, false, null and empty string faithfully', () => {
    for (const value of [0, false, null, '', []] as const) {
      store.set('k', value);
      expect(store.get('k', 'FALLBACK')).toEqual(value);
    }
  });

  it('distinguishes a stored null from an absent key', () => {
    store.set('k', null);
    expect(store.get('k', 'FALLBACK')).toBeNull();
    store.remove('k');
    expect(store.get('k', 'FALLBACK')).toBe('FALLBACK');
  });

  it('set returns true on success', () => {
    expect(store.set('k', 1)).toBe(true);
  });

  it('THROWS on a non-serialisable value rather than reporting a quota failure', () => {
    // A cycle is a bug in the caller's data, not a condition of the environment, so
    // it must not be folded into the `false` return.
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => store.set('k', cyclic)).toThrow(TypeError);
    expect(() => store.set('k', undefined)).toThrow(TypeError);
  });

  it('remove and clear are silent', () => {
    store.set('k', 1);
    expect(() => store.remove('k')).not.toThrow();
    expect(() => store.remove('never-existed')).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.get('k', 'gone')).toBe('gone');
  });
});

describe('createJsonStore when storage is unavailable', () => {
  it('get falls back and set returns false instead of throwing', () => {
    // Reading `window.localStorage` itself throws in a Safari private window, not
    // only the get/set calls - so the resolve has to be inside the try.
    const store = createJsonStore(() => {
      throw new Error('The operation is insecure.');
    });

    expect(store.get('k', 'fallback')).toBe('fallback');
    expect(store.set('k', 1)).toBe(false);
    expect(() => store.remove('k')).not.toThrow();
    expect(() => store.clear()).not.toThrow();
  });

  it('set returns false when the quota is exhausted', () => {
    const store = createJsonStore(
      () =>
        ({
          getItem: () => null,
          setItem: () => {
            throw new DOMException('QuotaExceededError', 'QuotaExceededError');
          },
          removeItem: () => undefined,
          clear: () => undefined,
        }) as unknown as Storage
    );

    expect(store.set('k', 1)).toBe(false);
  });

  it('get falls back when getItem itself throws', () => {
    const store = createJsonStore(
      () =>
        ({
          getItem: () => {
            throw new DOMException('denied');
          },
        }) as unknown as Storage
    );

    expect(store.get('k', 'fallback')).toBe('fallback');
  });

  it('never logs - a library writing to the host console is a side effect', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const store = createJsonStore(() => {
      throw new Error('nope');
    });
    store.get('k', 1);
    store.set('k', 1);
    expect(spy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    spy.mockRestore();
    warn.mockRestore();
  });
});

describe('cookieJar', () => {
  beforeEach(() => {
    for (const [name] of cookieJar.entries()) cookieJar.remove(name);
  });

  it('round-trips a value containing ; and =, which used to corrupt the jar', () => {
    // Measured on the version this replaced: no encodeURIComponent, so a ';' in the
    // value injected an attribute boundary and took the rest of the jar with it.
    cookieJar.set('other', 'intact');
    cookieJar.set('k', 'a;b=c d');

    expect(cookieJar.get('k')).toBe('a;b=c d');
    expect(cookieJar.get('other')).toBe('intact');
  });

  it('keeps a base64 value whole - the old get split on = once', () => {
    cookieJar.set('k', 'aGVsbG8gd29ybGQ=');
    expect(cookieJar.get('k')).toBe('aGVsbG8gd29ybGQ=');
  });

  it('remove ACTUALLY removes - the old clear wrote `expire=` and deleted nothing', () => {
    cookieJar.set('k', 'v');
    expect(cookieJar.get('k')).toBe('v');
    cookieJar.remove('k');
    expect(cookieJar.get('k')).toBeNull();
  });

  it('distinguishes absent (null) from present-and-empty (empty string)', () => {
    // The version this replaced returned '' for both.
    expect(cookieJar.get('never-set')).toBeNull();
    cookieJar.set('empty', '');
    expect(cookieJar.get('empty')).toBe('');
  });

  it('writes Path=/ by default so the value is readable across routes', () => {
    cookieJar.set('k', 'v');
    expect(document.cookie).toContain('k=v');
  });

  it('encodes a name with special characters too', () => {
    cookieJar.set('a b=c', 'v');
    expect(cookieJar.get('a b=c')).toBe('v');
  });

  it('refuses sameSite None without secure, which browsers reject anyway', () => {
    expect(() => cookieJar.set('k', 'v', { sameSite: 'None' })).toThrow(
      TypeError
    );
    expect(() =>
      cookieJar.set('k', 'v', { sameSite: 'None', secure: true })
    ).not.toThrow();
  });

  it('throws on an empty name', () => {
    expect(() => cookieJar.set('', 'v')).toThrow(TypeError);
    expect(() => cookieJar.remove('')).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => cookieJar.get(null)).toThrow(TypeError);
  });

  it('entries lists what the page can read, decoded', () => {
    cookieJar.set('a', '1');
    cookieJar.set('b', 'x y');
    expect(Object.fromEntries(cookieJar.entries())).toMatchObject({
      a: '1',
      b: 'x y',
    });
  });

  it('has NO clear - it cannot be done honestly from JavaScript', () => {
    // HttpOnly cookies are invisible and a different path/domain cannot be targeted
    // without knowing the exact pair. Asserted so nobody adds one back.
    expect('clear' in cookieJar).toBe(false);
  });
});
