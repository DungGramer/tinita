import { describe, expect, it } from 'vitest';
import { assertArray } from '../src/asserts/assertArray';
import { assertDpi } from '../src/asserts/assertDpi';
import { assertFiniteNumber } from '../src/asserts/assertFiniteNumber';
import { assertInteger } from '../src/asserts/assertInteger';
import { assertNonEmptyString } from '../src/asserts/assertNonEmptyString';
import { assertObject } from '../src/asserts/assertObject';
import { assertPositiveFiniteNumber } from '../src/asserts/assertPositiveFiniteNumber';
import { assertString } from '../src/asserts/assertString';

/** Every primitive, so contract-wide rules can be asserted once rather than eight times. */
const ALL = [
  ['assertArray', assertArray, [[], [1, 2]], ['x', 42, null, {}]],
  [
    'assertFiniteNumber',
    assertFiniteNumber,
    [0, -1, 1.5],
    ['1', Number.NaN, Number.POSITIVE_INFINITY, null],
  ],
  ['assertInteger', assertInteger, [0, -3, 42], [1.5, '1', Number.NaN, null]],
  [
    'assertNonEmptyString',
    assertNonEmptyString,
    ['a', ' '],
    ['', 42, null, []],
  ],
  ['assertObject', assertObject, [{}, [], new Date()], [null, 'x', 42]],
  [
    'assertPositiveFiniteNumber',
    assertPositiveFiniteNumber,
    [1, 0.5],
    [0, -1, '1', Number.NaN],
  ],
  ['assertString', assertString, ['', 'a'], [42, null, [], {}]],
] as const;

const messageOf = (run: () => void): string => {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }

  return '(did not throw)';
};

describe('every primitive shares one contract', () => {
  it.each(ALL)('%s accepts what it promises to accept', (_, assert, valid) => {
    for (const value of valid) {
      expect(() => assert(value, 'caller'), String(value)).not.toThrow();
    }
  });

  it.each(ALL)(
    '%s throws TypeError for everything else',
    (_, assert, __, invalid) => {
      for (const value of invalid) {
        expect(() => assert(value, 'caller'), String(value)).toThrow(TypeError);
      }
    }
  );

  it.each(ALL)(
    '%s puts the caller first in the message (§7)',
    (_, assert, __, invalid) => {
      // The whole reason every primitive takes a caller: one helper serves many APIs,
      // so a message without it cannot say which one refused.
      for (const value of invalid) {
        expect(
          messageOf(() => assert(value, 'myApi')).startsWith('myApi: '),
          String(value)
        ).toBe(true);
      }
    }
  );

  it.each(ALL)(
    '%s names the parameter, and defaults to "value"',
    (_, assert, __, invalid) => {
      expect(messageOf(() => assert(invalid[0], 'myApi', 'widthMm'))).toContain(
        'widthMm must be'
      );
      expect(messageOf(() => assert(invalid[0], 'myApi'))).toContain(
        'value must be'
      );
    }
  );

  it.each(ALL)(
    '%s throws TypeError, never RangeError (§8)',
    (_, assert, __, invalid) => {
      // RangeError is reserved for an explicit interval such as 0..1. Positivity and
      // integrality are value contracts, so they stay TypeError. Asserted so the
      // distinction cannot drift.
      for (const value of invalid) {
        expect(() => assert(value, 'caller'), String(value)).not.toThrow(
          RangeError
        );
      }
    }
  );
});

describe('messages say WHICH failure, not just that one happened', () => {
  it('assertFiniteNumber distinguishes a wrong type from a wrong value', () => {
    expect(messageOf(() => assertFiniteNumber('1', 'f'))).toBe(
      'f: value must be a finite number, got string'
    );
    expect(messageOf(() => assertFiniteNumber(Number.NaN, 'f'))).toBe(
      'f: value must be a finite number, got NaN'
    );
    // `got NaN` versus `got string` is the difference between a calculation that
    // went wrong upstream and an argument of the wrong type.
  });

  it('assertPositiveFiniteNumber reports the type problem BEFORE the sign problem', () => {
    expect(messageOf(() => assertPositiveFiniteNumber('1', 'f'))).toContain(
      'finite number, got string'
    );
    expect(messageOf(() => assertPositiveFiniteNumber(-1, 'f'))).toBe(
      'f: value must be a positive finite number, got -1'
    );
  });

  it('assertNonEmptyString distinguishes not-a-string from empty', () => {
    expect(messageOf(() => assertNonEmptyString(42, 'f'))).toContain(
      'got number'
    );
    expect(messageOf(() => assertNonEmptyString('', 'f'))).toContain(
      'got an empty string'
    );
  });

  it('assertObject and assertArray report null as null, not as object', () => {
    expect(messageOf(() => assertObject(null, 'f'))).toContain('got null');
    expect(messageOf(() => assertArray(null, 'f'))).toContain('got null');
  });

  it('assertObject reports typeof, never the value itself', () => {
    // String(value) on an object runs a custom toString - a side effect inside a
    // failure path, and one that can itself throw.
    const hostile = {
      toString() {
        throw new Error('toString ran');
      },
    };
    expect(() => assertObject(hostile, 'f')).not.toThrow();
    expect(messageOf(() => assertArray(hostile, 'f'))).toBe(
      'f: value must be an array, got object'
    );
  });
});

describe('the invariants each primitive establishes', () => {
  it('assertObject ACCEPTS arrays and class instances, and the name says Object for that reason', () => {
    // A name promising "plain" while admitting arrays would hide the behaviour.
    expect(() => assertObject([], 'f')).not.toThrow();
    expect(() => assertObject(new Date(), 'f')).not.toThrow();
    expect(() => assertObject(new Map(), 'f')).not.toThrow();
  });

  it('assertNonEmptyString does NOT trim', () => {
    // Trimming would silently change the caller's data.
    expect(() => assertNonEmptyString(' ', 'f')).not.toThrow();
    expect(() => assertNonEmptyString('\n', 'f')).not.toThrow();
  });

  it('assertPositiveFiniteNumber refuses zero; assertInteger accepts it', () => {
    expect(() => assertPositiveFiniteNumber(0, 'f')).toThrow(TypeError);
    expect(() => assertInteger(0, 'f')).not.toThrow();
    expect(() => assertInteger(-3, 'f')).not.toThrow();
  });

  it('assertArray recognises an array from another realm', () => {
    // Array.isArray rather than instanceof Array, so an array built in an iframe,
    // a worker or a vm context is still an array.
    const foreign = Reflect.construct(Array, [], Array);
    Object.setPrototypeOf(foreign, null);
    expect(() => assertArray(foreign, 'f')).not.toThrow();
  });

  it('assertDpi keeps the domain wording while delegating the arithmetic', () => {
    expect(messageOf(() => assertDpi(-300, 'toPrintPixels'))).toBe(
      'toPrintPixels: dpi must be a positive finite number, got -300'
    );
    expect(() => assertDpi(300, 'toPrintPixels')).not.toThrow();
  });
});

describe('narrowing is real, and tsc is what proves it', () => {
  it('a value typed unknown is usable as its asserted type afterwards', () => {
    // These bodies would not COMPILE without the `asserts` signatures. The runtime
    // assertion here is secondary; the test exists so `pnpm check-types` covers the
    // compile-time half of the contract.
    const double = (value: unknown): number => {
      assertFiniteNumber(value, 'double');

      return value * 2;
    };
    const upper = (value: unknown): string => {
      assertString(value, 'upper');

      return value.toUpperCase();
    };
    const first = (value: unknown): unknown => {
      assertArray(value, 'first');

      return value[0];
    };
    const keys = (value: unknown): string[] => {
      assertObject(value, 'keys');

      return Object.keys(value);
    };

    expect(double(21)).toBe(42);
    expect(upper('a')).toBe('A');
    expect(first([1, 2])).toBe(1);
    expect(keys({ a: 1 })).toEqual(['a']);
  });
});
