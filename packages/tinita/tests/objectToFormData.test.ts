import { describe, expect, it } from 'vitest';
import { objectToFormData } from '../src/converter/objectToFormData';

/**
 * FormData as plain pairs, so assertions read like the wire format.
 *
 * The cast is needed because the base tsconfig's `lib` has no `DOM.Iterable`, so
 * `FormData.entries()` is not in the type surface even though every runtime has
 * it. Widening `lib` for the whole package to satisfy one test helper would be the
 * larger change.
 */
const pairs = (form: FormData): [string, unknown][] =>
  [...(form as unknown as Iterable<[string, FormDataEntryValue]>)].map(
    ([key, value]) => [key, value instanceof Blob ? '<blob>' : value]
  );

describe('objectToFormData', () => {
  it('flattens nested objects with bracket notation', () => {
    expect(
      pairs(objectToFormData({ name: 'John', address: { city: 'Hanoi' } }))
    ).toEqual([
      ['name', 'John'],
      ['address[city]', 'Hanoi'],
    ]);
  });

  it('indexes arrays by default and repeats the key with brackets', () => {
    expect(pairs(objectToFormData({ tags: ['a', 'b'] }))).toEqual([
      ['tags[0]', 'a'],
      ['tags[1]', 'b'],
    ]);
    expect(
      pairs(objectToFormData({ tags: ['a', 'b'] }, { arrayFormat: 'brackets' }))
    ).toEqual([
      ['tags[]', 'a'],
      ['tags[]', 'b'],
    ]);
  });

  it('omits null and undefined by default, and can send them as empty instead', () => {
    expect(pairs(objectToFormData({ a: 1, b: null, c: undefined }))).toEqual([
      ['a', '1'],
    ]);
    expect(
      pairs(objectToFormData({ b: null }, { nullHandling: 'empty' }))
    ).toEqual([['b', '']]);
  });

  it('drops empty arrays and objects unless asked to keep them', () => {
    expect(pairs(objectToFormData({ a: [], b: {} }))).toEqual([]);
    expect(
      pairs(
        objectToFormData(
          { a: [], b: {} },
          { includeEmptyArrays: true, includeEmptyObjects: true }
        )
      )
    ).toEqual([
      ['a', ''],
      ['b', ''],
    ]);
  });

  it('serialises a Date as ISO 8601', () => {
    expect(
      pairs(objectToFormData({ at: new Date('2026-10-01T00:00:00.000Z') }))
    ).toEqual([['at', '2026-10-01T00:00:00.000Z']]);
  });

  it('SKIPS an invalid Date rather than throwing - documented, and easy to miss', () => {
    // `new Date('nonsense').toISOString()` throws, so the field is simply absent.
    // Asserted here so the behaviour cannot drift without someone noticing.
    expect(
      pairs(objectToFormData({ at: new Date('nonsense'), ok: 1 }))
    ).toEqual([['ok', '1']]);
  });

  it('passes a Blob through whole instead of walking its keys', () => {
    expect(pairs(objectToFormData({ file: new Blob(['hi']) }))).toEqual([
      ['file', '<blob>'],
    ]);
  });

  it('keeps 0 and false, which are values a caller means', () => {
    expect(pairs(objectToFormData({ count: 0, active: false }))).toEqual([
      ['count', '0'],
      ['active', 'false'],
    ]);
  });

  it('handles bigint', () => {
    expect(pairs(objectToFormData({ id: 9007199254740993n }))).toEqual([
      ['id', '9007199254740993'],
    ]);
  });

  it('nests arrays inside arrays', () => {
    expect(pairs(objectToFormData({ grid: [[1, 2], [3]] }))).toEqual([
      ['grid[0][0]', '1'],
      ['grid[0][1]', '2'],
      ['grid[1][0]', '3'],
    ]);
  });

  it('THROWS on a cycle instead of overflowing the stack', () => {
    // Measured before the guard: RangeError: Maximum call stack size exceeded,
    // naming neither the function nor the key that caused it.
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;

    expect(() => objectToFormData(cyclic)).toThrow(TypeError);
    expect(() => objectToFormData(cyclic)).toThrow(/cycle/);
  });

  it('runs in Node, where FileList does not exist', () => {
    // vitest runs this in plain Node with no DOM. A bare `value instanceof
    // FileList` throws ReferenceError here; the typeof guard is what makes the
    // whole function usable during SSR.
    expect(typeof FileList).toBe('undefined');
    expect(() => objectToFormData({ a: 1 })).not.toThrow();
  });

  it('an empty object produces empty FormData', () => {
    expect(pairs(objectToFormData({}))).toEqual([]);
  });
});
