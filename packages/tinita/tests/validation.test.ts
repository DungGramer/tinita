import { describe, expect, it } from 'vitest';
import { hasVietnameseDiacritics } from '../src/validation/hasVietnameseDiacritics';
import { isAsciiLetters } from '../src/validation/isAsciiLetters';
import { isEmail } from '../src/validation/isEmail';
import { isNumericString } from '../src/validation/isNumericString';
import { isUrl } from '../src/validation/isUrl';

const PREDICATES = [
  ['hasVietnameseDiacritics', hasVietnameseDiacritics],
  ['isAsciiLetters', isAsciiLetters],
  ['isEmail', isEmail],
  ['isNumericString', isNumericString],
  ['isUrl', isUrl],
] as const;

describe('every predicate shares one contract', () => {
  it.each(PREDICATES)(
    '%s returns false for a non-string, never throws',
    (_, fn) => {
      for (const value of [
        undefined,
        null,
        42,
        0,
        true,
        false,
        {},
        [],
        Symbol('s'),
      ]) {
        expect(fn(value)).toBe(false);
      }
    }
  );

  it.each(PREDICATES)('%s returns false for the empty string', (_, fn) => {
    expect(fn('')).toBe(false);
  });

  it.each(PREDICATES)(
    '%s is DETERMINISTIC - same input, same answer',
    (_, fn) => {
      // The only test that catches a `g` flag on a shared RegExp. Measured 2026-10-01,
      // the previous `vietnameseRegex` was `/giu/` and `.test()` advanced `lastIndex`,
      // so `hasVietnameseDiacritics('Hòa')` returned
      // true false true false true false across six calls.
      for (const sample of [
        'Hòa',
        'abc',
        '42',
        'a@b.co',
        'https://a.com',
        'Đèn 123',
      ]) {
        const first = fn(sample);
        for (let i = 0; i < 5; i += 1) expect(fn(sample)).toBe(first);
      }
    }
  );

  it.each(PREDICATES)('%s survives a long string', (_, fn) => {
    expect(() => fn('a'.repeat(100_000))).not.toThrow();
  });
});

describe('isNumericString', () => {
  it('accepts digits only', () => {
    expect(isNumericString('0')).toBe(true);
    expect(isNumericString('42')).toBe(true);
    expect(isNumericString('007')).toBe(true);
  });

  it('REJECTS things that are numbers but not digit strings', () => {
    // The name is NumericString, not Number, precisely because of this list.
    for (const sample of ['-1', '1.5', '1e3', ' 1', '1 ', '1,000', '٣', '１']) {
      expect(isNumericString(sample)).toBe(false);
    }
  });

  it('does not coerce - the previous version let isNumber(12) be true', () => {
    expect(isNumericString(12)).toBe(false);
  });
});

describe('isAsciiLetters', () => {
  it('accepts ASCII letters in either case', () => {
    expect(isAsciiLetters('abc')).toBe(true);
    expect(isAsciiLetters('ABC')).toBe(true);
    expect(isAsciiLetters('aBc')).toBe(true);
  });

  it('REJECTS letters outside ASCII, which the old name implied it accepted', () => {
    for (const sample of ['Đèn', 'café', '日本', 'Ёж', 'a b', 'a1']) {
      expect(isAsciiLetters(sample)).toBe(false);
    }
  });
});

describe('hasVietnameseDiacritics', () => {
  it('finds a diacritic anywhere in the string', () => {
    expect(hasVietnameseDiacritics('Hòa')).toBe(true);
    expect(hasVietnameseDiacritics('xin chào các bạn')).toBe(true);
    expect(hasVietnameseDiacritics('Đèn')).toBe(true);
    expect(hasVietnameseDiacritics('trailing ữ')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(hasVietnameseDiacritics('Ò')).toBe(true);
    expect(hasVietnameseDiacritics('Đ')).toBe(true);
  });

  it('is false for Vietnamese written WITHOUT diacritics - and that is the point', () => {
    // This is why the function is not called `isVietnamese`.
    expect(hasVietnameseDiacritics('Xin chao cac ban')).toBe(false);
  });

  it('does NOT match decomposed input, and the JSDoc says so', () => {
    // 'a' + U+0300 renders as 'à' but is two code points.
    expect(hasVietnameseDiacritics('à')).toBe(false);
    expect(hasVietnameseDiacritics('à'.normalize('NFC'))).toBe(true);
  });
});

describe('isEmail', () => {
  it('accepts ordinary addresses', () => {
    for (const sample of [
      'a@b.co',
      'first.last@sub.example.com',
      'a+tag@b.io',
    ]) {
      expect(isEmail(sample)).toBe(true);
    }
  });

  it('accepts long TLDs, which {2,4} rejected', () => {
    // Measured 2026-10-01: the previous pattern returned false for all three.
    for (const sample of ['a@b.museum', 'a@b.online', 'a@b.technology']) {
      expect(isEmail(sample)).toBe(true);
    }
  });

  it('rejects the shapes a form should catch', () => {
    for (const sample of [
      'abc',
      'a@b',
      'a@b.c',
      '@b.co',
      'a b@c.co',
      'a@@b.co',
    ]) {
      expect(isEmail(sample)).toBe(false);
    }
  });
});

describe('isUrl', () => {
  it('accepts an absolute URL, localhost with a port included', () => {
    // The hand-built regex this replaced returned false for localhost:3000.
    for (const sample of [
      'https://a.com',
      'http://a.com/x?y=1#z',
      'https://localhost:3000',
      'https://a.com/ĐÈN',
      'ftp://a.com',
    ]) {
      expect(isUrl(sample)).toBe(true);
    }
  });

  it('requires a scheme', () => {
    for (const sample of ['a.com', 'localhost', '//a.com', 'foo']) {
      expect(isUrl(sample)).toBe(false);
    }
  });

  it('is NOT a safety check, and the JSDoc says so', () => {
    // Asserted so nobody "fixes" this into a security guard it cannot be.
    expect(isUrl('javascript:alert(1)')).toBe(true);
    expect(isUrl('data:text/html,<script>1</script>')).toBe(true);
  });
});
