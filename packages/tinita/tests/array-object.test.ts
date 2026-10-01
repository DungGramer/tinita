import { describe, expect, it } from 'vitest';
import { createRange } from '../src/array/createRange';
import { getArrayValue } from '../src/array/getArrayValue';
import { sortAlphaText } from '../src/array/sortAlphaText';
import { uniqueArray } from '../src/array/uniqueArray';
import { enumKeys } from '../src/object/enumKeys';
import { omit } from '../src/object/omit';
import { once } from '../src/object/once';
import { pick } from '../src/object/pick';
import { sortObjectKeys } from '../src/object/sortObjectKeys';

describe('createRange', () => {
  it('includes both ends', () => {
    expect(createRange(1, 4)).toEqual([1, 2, 3, 4]);
    expect(createRange(0, 0)).toEqual([0]);
    expect(createRange(-2, 0)).toEqual([-2, -1, 0]);
  });

  it('returns [] when end < start rather than counting backwards', () => {
    expect(createRange(4, 1)).toEqual([]);
  });

  it('throws on a fractional bound instead of guessing', () => {
    // createRange(1, 2.5) has no single right answer.
    expect(() => createRange(1, 2.5)).toThrow(TypeError);
    expect(() => createRange(Number.NaN, 1)).toThrow(TypeError);
    expect(() => createRange(1, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('getArrayValue', () => {
  it('reads the index from an array and passes a non-array through', () => {
    expect(getArrayValue(['a', 'b'])).toBe('a');
    expect(getArrayValue(['a', 'b'], 1)).toBe('b');
    expect(getArrayValue('a')).toBe('a');
    expect(getArrayValue('a', 5)).toBe('a');
  });

  it('is undefined out of range, and the TYPE says so', () => {
    // The version this replaced declared `T` while returning undefined here.
    const value: string | undefined = getArrayValue(['a'], 5);
    expect(value).toBeUndefined();
  });

  it('does not count a negative index from the end', () => {
    expect(getArrayValue(['a', 'b'], -1)).toBeUndefined();
  });
});

describe('uniqueArray', () => {
  it('keeps the first occurrence, order preserved', () => {
    expect(uniqueArray([1, 1, 2])).toEqual([1, 2]);
    expect(uniqueArray(['b', 'a', 'b'])).toEqual(['b', 'a']);
  });

  it('matches objects by reference, not by shape', () => {
    const shared = { id: 1 };
    expect(uniqueArray([shared, shared, { id: 1 }])).toHaveLength(2);
  });

  it('treats NaN as equal to NaN, and -0 as 0 (SameValueZero)', () => {
    expect(uniqueArray([Number.NaN, Number.NaN])).toEqual([Number.NaN]);
    expect(uniqueArray([0, -0])).toHaveLength(1);
  });

  it('does not mutate the input', () => {
    const input = [1, 1, 2];
    uniqueArray(input);
    expect(input).toEqual([1, 1, 2]);
  });

  it('throws instead of passing a non-array through', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => uniqueArray(null)).toThrow(TypeError);
  });
});

describe('sortAlphaText', () => {
  it('does NOT mutate the input - the version it replaced sorted in place', () => {
    const input = ['b', 'a', 'c'];
    const output = sortAlphaText(input);
    expect(output).toEqual(['a', 'b', 'c']);
    expect(input).toEqual(['b', 'a', 'c']);
  });

  it('sorts Vietnamese correctly when told the locale', () => {
    // Measured 2026-10-01: with no locale (host default en-US) this came out
    // 'Ẩn Anh Ánh Ba', which is wrong. The library ships Vietnamese helpers, so this
    // was wrong by default for its own audience.
    expect(sortAlphaText(['Ánh', 'Anh', 'Ẩn', 'Ba'], { locale: 'vi' })).toEqual(
      ['Anh', 'Ánh', 'Ẩn', 'Ba']
    );
  });

  it('defaults to a FIXED locale, not the host locale', () => {
    // Determinism across machines: two calls with no locale and one with 'en' must
    // agree, whatever the host is set to.
    const input = ['Ánh', 'Anh', 'Ẩn', 'Ba'];
    expect(sortAlphaText(input)).toEqual(
      sortAlphaText(input, { locale: 'en' })
    );
  });

  it('sorts descending, and by a key', () => {
    expect(sortAlphaText(['a', 'c', 'b'], { order: 'desc' })).toEqual([
      'c',
      'b',
      'a',
    ]);
    const users = [{ name: 'b' }, { name: 'a' }];
    expect(sortAlphaText(users, { key: (u) => u.name })).toEqual([
      { name: 'a' },
      { name: 'b' },
    ]);
  });

  it('sorts numerically when asked', () => {
    expect(
      sortAlphaText(['item10', 'item2'], { collator: { numeric: true } })
    ).toEqual(['item2', 'item10']);
  });

  it('names the offending index when an item is not a string and no key is given', () => {
    // The version this replaced threw `keyA.localeCompare is not a function`.
    expect(() => sortAlphaText([1, 2])).toThrow(/index 0 is number/);
    expect(() => sortAlphaText(['a', 2])).toThrow(/index 1 is number/);
  });

  it('is stable for ties', () => {
    const input = [
      { k: 'a', id: 1 },
      { k: 'a', id: 2 },
      { k: 'a', id: 3 },
    ];
    expect(sortAlphaText(input, { key: (i) => i.k }).map((i) => i.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('handles the empty array', () => {
    expect(sortAlphaText([])).toEqual([]);
  });
});

describe('pick / omit', () => {
  it('pick takes only owned keys and OMITS an absent one entirely', () => {
    expect(pick({ a: 1, b: 2 }, ['a'])).toEqual({ a: 1 });
    const result = pick({ a: 1 } as { a: number; zz?: number }, ['zz']);
    expect('zz' in result).toBe(false);
  });

  it('pick skips inherited properties', () => {
    const parent = { inherited: 1 };
    const child = Object.create(parent) as { inherited: number; own?: number };
    child.own = 2;
    expect(pick(child, ['inherited', 'own'])).toEqual({ own: 2 });
  });

  it('omit copies everything else and returns a new object', () => {
    const input = { a: 1, b: 2 };
    expect(omit(input, ['b'])).toEqual({ a: 1 });
    expect(omit(input, [])).toEqual(input);
    expect(omit(input, [])).not.toBe(input);
  });

  it('neither mutates the input', () => {
    const input = { a: 1, b: 2 };
    pick(input, ['a']);
    omit(input, ['a']);
    expect(input).toEqual({ a: 1, b: 2 });
  });

  it('both throw on null instead of returning it unchanged', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => pick(null, ['a'])).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => omit(null, ['a'])).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => pick({ a: 1 }, 'a')).toThrow(TypeError);
  });

  it('reads a getter rather than copying it', () => {
    let reads = 0;
    const source = {
      get value() {
        reads += 1;
        return 7;
      },
    };
    const picked = pick(source, ['value']);
    expect(picked.value).toBe(7);
    expect(picked.value).toBe(7);
    expect(reads).toBe(1);
  });
});

describe('enumKeys', () => {
  it('drops the reverse-mapped numeric keys of a numeric enum', () => {
    enum Direction {
      Up,
      Down,
    }
    expect(Object.keys(Direction)).toEqual(['0', '1', 'Up', 'Down']);
    expect(enumKeys(Direction)).toEqual(['Up', 'Down']);
  });

  it('returns every key of a string enum, which has no reverse mapping', () => {
    enum Colour {
      Red = 'red',
      Blue = 'blue',
    }
    expect(enumKeys(Colour)).toEqual(['Red', 'Blue']);
  });

  it('throws on a non-object', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => enumKeys(null)).toThrow(TypeError);
  });
});

describe('sortObjectKeys', () => {
  it('sorts string keys', () => {
    expect(Object.keys(sortObjectKeys({ b: 1, a: 2, c: 3 }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('cannot reorder integer-like keys, and the JSDoc says so', () => {
    // JavaScript enumerates integer-like keys in ascending numeric order first,
    // whatever the insertion order. Asserted so the limit is not mistaken for a bug.
    expect(Object.keys(sortObjectKeys({ 2: 'a', 1: 'b' }))).toEqual(['1', '2']);
  });

  it('does not mutate the input and throws on null', () => {
    const input = { b: 1, a: 2 };
    sortObjectKeys(input);
    expect(Object.keys(input)).toEqual(['b', 'a']);
    // @ts-expect-error deliberately wrong type
    expect(() => sortObjectKeys(null)).toThrow(TypeError);
  });
});

describe('once', () => {
  it('calls through exactly once and replays the result', () => {
    let calls = 0;
    const run = once(() => {
      calls += 1;
      return calls;
    });
    expect([run(), run(), run()]).toEqual([1, 1, 1]);
    expect(calls).toBe(1);
  });

  it('remembers an undefined result, so a void function still runs once', () => {
    let calls = 0;
    const run = once(() => {
      calls += 1;
    });
    run();
    run();
    expect(calls).toBe(1);
  });

  it('does NOT remember a throw - the next call tries again', () => {
    // Deliberate: a failed init should not poison the result forever. Asserted so
    // the behaviour cannot drift silently either way.
    let attempts = 0;
    const run = once(() => {
      attempts += 1;
      if (attempts < 3) throw new Error('not yet');
      return 'ok';
    });
    expect(() => run()).toThrow('not yet');
    expect(() => run()).toThrow('not yet');
    expect(run()).toBe('ok');
    expect(attempts).toBe(3);
    expect(run()).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('ignores arguments to later calls - it is not memoisation by argument', () => {
    const run = once((n: number) => n * 2);
    expect(run(1)).toBe(2);
    expect(run(50)).toBe(2);
  });
});
