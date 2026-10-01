import { describe, expect, it } from 'vitest';
import { createBlobObjectUrl } from '../src/converter/createBlobObjectUrl';
import { mapToObject } from '../src/converter/mapToObject';
import { objectToMap } from '../src/converter/objectToMap';
import { parseKeyCombination } from '../src/converter/parseKeyCombination';
import { sortDates } from '../src/date/sortDates';
import { conditionalEntry } from '../src/object/conditionalEntry';
import { omitEmptyValues } from '../src/object/omitEmptyValues';
import { prependUnique } from '../src/array/prependUnique';
import { DEFAULT_PRINT_MARGINS } from '../src/print/defaultPrintMargins';
import { PAGE_SIZES } from '../src/print/pageSizes';
import { PHOTO_PRINT_SIZES } from '../src/print/photoPrintSizes';

describe('parseKeyCombination', () => {
  it('keeps EVERY modifier - the version it replaced kept only the last', () => {
    // Measured 2026-10-01: 'Ctrl+Shift+A' came back with ctrlKey false, and
    // 'Cmd+Alt+Shift+K' with only shiftKey set.
    expect(parseKeyCombination('Ctrl+Shift+A')).toEqual({
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
    });
    expect(parseKeyCombination('Cmd+Alt+Shift+K')).toEqual({
      key: 'K',
      ctrlKey: false,
      shiftKey: true,
      altKey: true,
      metaKey: true,
    });
  });

  it('is not confused by a repeated modifier - the g flag used to zero it', () => {
    // 'Ctrl+Ctrl+A' returned all false: .test() on a /g/ regex advanced lastIndex.
    expect(parseKeyCombination('Ctrl+Ctrl+A').ctrlKey).toBe(true);
  });

  it('ALWAYS returns all five fields, whatever the input shape', () => {
    // The version this replaced returned { key } alone when there was no '+'.
    expect(parseKeyCombination('A')).toEqual({
      key: 'A',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
    expect(Object.keys(parseKeyCombination('A')).sort()).toEqual(
      Object.keys(parseKeyCombination('Ctrl+A')).sort()
    );
  });

  it('accepts symbol aliases and any case, and trims', () => {
    expect(parseKeyCombination('⌘+⌥+K')).toMatchObject({
      key: 'K',
      metaKey: true,
      altKey: true,
    });
    expect(parseKeyCombination('CONTROL+a')).toMatchObject({
      key: 'a',
      ctrlKey: true,
    });
    expect(parseKeyCombination(' ctrl + A ')).toMatchObject({
      key: 'A',
      ctrlKey: true,
    });
  });

  it('matches whole tokens, so a key named Salt is not Alt', () => {
    // The old substring regex 'alt|option|⌥' matched inside any token.
    expect(parseKeyCombination('Salt').altKey).toBe(false);
    expect(parseKeyCombination('Salt').key).toBe('Salt');
  });

  it('takes a trailing plus as the key', () => {
    expect(parseKeyCombination('Ctrl++')).toMatchObject({
      key: '+',
      ctrlKey: true,
    });
  });

  it('REFUSES an unknown modifier instead of ignoring it', () => {
    expect(() => parseKeyCombination('Hyper+A')).toThrow(TypeError);
    expect(() => parseKeyCombination('Hyper+A')).toThrow(
      /not a known modifier/
    );
  });

  it('throws on a non-string and on empty input', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => parseKeyCombination(null)).toThrow(TypeError);
    expect(() => parseKeyCombination('   ')).toThrow(TypeError);
  });
});

describe('sortDates', () => {
  it('sorts ascending by default and returns a NEW array', () => {
    const input = ['2021-01-01', '2020-01-01'];
    expect(sortDates(input)).toEqual(['2020-01-01', '2021-01-01']);
    expect(input).toEqual(['2021-01-01', '2020-01-01']);
  });

  it('actually reverses for desc - the old operator precedence did not', () => {
    // The version this replaced wrote `left - right * direction`, and * binds
    // tighter than -, so desc computed left + right: not an ordering at all.
    expect(
      sortDates(['2020-01-01', '2021-01-01', '2019-01-01'], 'desc')
    ).toEqual(['2021-01-01', '2020-01-01', '2019-01-01']);
  });

  it('puts unparseable dates at the end, in input order', () => {
    expect(
      sortDates(['nonsense', '2021-01-01', 'also bad', '2020-01-01'])
    ).toEqual(['2020-01-01', '2021-01-01', 'nonsense', 'also bad']);
  });

  it('handles empty and single-element arrays, and throws on a non-array', () => {
    expect(sortDates([])).toEqual([]);
    expect(sortDates(['2020-01-01'])).toEqual(['2020-01-01']);
    // @ts-expect-error deliberately wrong type
    expect(() => sortDates(null)).toThrow(TypeError);
  });
});

describe('print tables', () => {
  it('PAGE_SIZES matches the ISO standard exactly', () => {
    // Verified 2026-10-01 against ISO 216 / ISO 217 / ISO 269 and the inch sizes.
    expect(PAGE_SIZES.A4).toEqual([210, 297]);
    expect(PAGE_SIZES.C5).toEqual([162, 229]);
    expect(PAGE_SIZES.SRA3).toEqual([320, 450]);
    expect(PAGE_SIZES.LETTER).toEqual([215.9, 279.4]);
    expect(PAGE_SIZES.LEGAL).toEqual([215.9, 355.6]);
    expect(PAGE_SIZES.TABLOID).toEqual([279.4, 431.8]);
    expect(PAGE_SIZES.EXECUTIVE).toEqual([184.15, 266.7]);
  });

  it('PHOTO_PRINT_SIZES computes every ratio on ONE basis', () => {
    // The version this replaced mixed three bases in a twelve-row table: inches for
    // 8INX10IN, pixels at 300dpi for A4 (2480/3508), and a hand-written 1 for
    // 14INX14IN.
    for (const size of PHOTO_PRINT_SIZES) {
      expect(
        Math.abs(size.ratio - size.width / size.height),
        size.key
      ).toBeLessThan(1e-9);
    }
  });

  it('PHOTO_PRINT_SIZES A4 agrees with the ISO value, not the 300dpi one', () => {
    const a4 = PHOTO_PRINT_SIZES.find((size) => size.key === 'A4');
    expect(a4).toMatchObject({ width: 210, height: 297 });
    expect(a4?.ratio).toBeCloseTo(210 / 297, 12);
    // The old table stored 2480/3508 = 0.707012 against the true 0.707071.
    expect(a4?.ratio).not.toBeCloseTo(2480 / 3508, 12);
  });

  it('14INX14IN is square by construction, not by a hand-written 1', () => {
    const square = PHOTO_PRINT_SIZES.find((size) => size.key === '14INX14IN');
    expect(square?.width).toBe(square?.height);
    expect(square?.ratio).toBe(1);
  });

  it('DEFAULT_PRINT_MARGINS lives apart from the ISO table', () => {
    expect(DEFAULT_PRINT_MARGINS).toEqual([10, 10]);
  });
});

describe('mapToObject / objectToMap', () => {
  it('mapToObject is shallow and keeps the value type', () => {
    const map = new Map([['a', 1]]);
    expect(mapToObject(map)).toEqual({ a: 1 });
    const nested = new Map<string, Map<string, number>>([
      ['x', new Map([['y', 1]])],
    ]);
    expect(mapToObject(nested).x).toBeInstanceOf(Map);
  });

  it('objectToMap is DEEP, so the pair is not a round-trip', () => {
    const result = objectToMap({ a: { b: 1 } });
    expect(result.get('a')).toBeInstanceOf(Map);
    expect((result.get('a') as Map<string, unknown>).get('b')).toBe(1);
  });

  it('objectToMap turns an array into a Map keyed by index, and the JSDoc says so', () => {
    const result = objectToMap({ list: [10, 20] });
    const list = result.get('list') as Map<string, unknown>;
    expect(list).toBeInstanceOf(Map);
    expect(list.get('0')).toBe(10);
  });

  it('objectToMap keeps an existing Map as-is rather than walking it', () => {
    const inner = new Map([['k', 1]]);
    expect(objectToMap({ inner }).get('inner')).toBe(inner);
  });

  it('neither mutates its input', () => {
    const map = new Map([['a', 1]]);
    const obj = { a: 1 };
    mapToObject(map);
    objectToMap(obj);
    expect([...map]).toEqual([['a', 1]]);
    expect(obj).toEqual({ a: 1 });
  });
});

describe('carried over from phase 02, now covered', () => {
  it('conditionalEntry always returns a spreadable object', () => {
    expect(conditionalEntry('a', 1)).toEqual({ a: 1 });
    expect(conditionalEntry('a', 1, false)).toEqual({});
    expect(conditionalEntry('a', null)).toEqual({});
    // 0 and false are values a caller means.
    expect(conditionalEntry('a', 0)).toEqual({ a: 0 });
    expect(conditionalEntry('a', false)).toEqual({ a: false });
  });

  it('omitEmptyValues drops null and undefined BUT KEEPS empty string by default', () => {
    // invalidValues defaults to [null, undefined]. '' is a value a caller may mean,
    // so dropping it is opt-in. Asserted so the default cannot drift.
    expect(omitEmptyValues({ a: 1, b: null, c: '', d: undefined })).toEqual({
      a: 1,
      c: '',
    });
    expect(
      omitEmptyValues({ a: 1, c: '' }, { invalidValues: [null, undefined, ''] })
    ).toEqual({ a: 1 });
    expect(omitEmptyValues({ a: 1, b: [] })).toEqual({ a: 1 });
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => omitEmptyValues(cyclic)).toThrow(TypeError);
  });

  it('prependUnique puts new items first and never mutates', () => {
    const list = [{ value: 'a' }];
    expect(
      prependUnique(list, [{ value: 'a' }, { value: 'b' }], 'value')
    ).toEqual([{ value: 'b' }, { value: 'a' }]);
    expect(list).toEqual([{ value: 'a' }]);
  });
});

describe('createBlobObjectUrl', () => {
  it('mints a blob: URL that the caller must revoke', () => {
    const url = createBlobObjectUrl(new Blob(['hi']));
    expect(url.startsWith('blob:')).toBe(true);
    URL.revokeObjectURL(url);
  });

  it('works in plain Node, which is why it lives in tinita', () => {
    // Measured with docker run node:{18,20,22}-alpine: all three have
    // URL.createObjectURL (Node added it in v16.7.0).
    expect(typeof URL.createObjectURL).toBe('function');
  });
});
