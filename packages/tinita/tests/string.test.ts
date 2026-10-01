import { describe, expect, it } from 'vitest';
import { collapseWhitespace } from '../src/string/collapseWhitespace';
import { insertTextEveryNWords } from '../src/string/insertTextEveryNWords';
import { sentenceCase } from '../src/string/sentenceCase';
import { snakeToTitleCase } from '../src/string/snakeToTitleCase';
import { stringToSelector } from '../src/string/stringToSelector';
import { titleCase } from '../src/string/titleCase';

const ALL = [
  ['collapseWhitespace', collapseWhitespace],
  ['insertTextEveryNWords', insertTextEveryNWords],
  ['sentenceCase', sentenceCase],
  ['snakeToTitleCase', snakeToTitleCase],
  ['stringToSelector', stringToSelector],
  ['titleCase', titleCase],
] as const;

describe('every string helper shares one contract', () => {
  it.each(ALL)('%s throws TypeError on a non-string', (_, fn) => {
    for (const value of [undefined, null, 42, {}, []]) {
      // @ts-expect-error deliberately wrong type
      expect(() => fn(value)).toThrow(TypeError);
    }
  });

  it.each(ALL)('%s handles the empty string without throwing', (_, fn) => {
    expect(() => fn('')).not.toThrow();
  });

  it.each(ALL)('%s is deterministic', (_, fn) => {
    for (const sample of ['hello world', 'a_b', 'Đèn đường', '']) {
      expect(fn(sample)).toEqual(fn(sample));
    }
  });
});

describe('titleCase', () => {
  it('uppercases each word and keeps separators byte for byte', () => {
    expect(titleCase('hello world')).toBe('Hello World');
    expect(titleCase('a  b')).toBe('A  B');
    expect(titleCase('a\tb')).toBe('A\tB');
  });

  it('PRESERVES casing after the first character of each word', () => {
    // Title case uppercases every word-initial letter, so 'iPhone' -> 'IPhone'. What
    // changed is the tail. Measured 2026-10-01, the version this replaced lowercased
    // it: the comments show what it used to return.
    expect(titleCase('iPhone SDK')).toBe('IPhone SDK'); // was 'Iphone Sdk'
    expect(titleCase('HTML and CSS')).toBe('HTML And CSS'); // was 'Html And Css'
    expect(titleCase('McDonald')).toBe('McDonald'); // was 'Mcdonald'
  });

  it('lowercases the rest only when asked', () => {
    expect(titleCase('HELLO WORLD', { lowercaseRest: true })).toBe(
      'Hello World'
    );
    expect(titleCase('iPhone', { lowercaseRest: true })).toBe('Iphone');
  });

  it('treats a hyphen as a word boundary', () => {
    expect(titleCase('mary-jane watson')).toBe('Mary-Jane Watson');
  });

  it('leaves characters without case alone', () => {
    expect(titleCase('1st place')).toBe('1st Place');
    expect(titleCase('🙂 hello')).toBe('🙂 Hello');
  });

  it('handles Vietnamese and an expanding uppercase', () => {
    expect(titleCase('đèn đường')).toBe('Đèn Đường');
    expect(titleCase('ßeta')).toBe('SSeta'); // toUpperCase('ß') is 'SS'
  });

  it('is locale-independent, so Turkish i does not become İ', () => {
    // Asserted so nobody swaps in toLocaleUpperCase and makes output host-dependent.
    expect(titleCase('istanbul')).toBe('Istanbul');
  });
});

describe('sentenceCase', () => {
  it('lowercases then capitalises the first character', () => {
    expect(sentenceCase('hello world')).toBe('Hello world');
    expect(sentenceCase('HELLO WORLD')).toBe('Hello world');
  });

  it('trims, because a leading space has no character to capitalise', () => {
    expect(sentenceCase('  HELLO  ')).toBe('Hello');
    expect(sentenceCase('   ')).toBe('');
  });

  it('lowercases acronyms too, which is the documented cost', () => {
    expect(sentenceCase('NASA launched')).toBe('Nasa launched');
  });
});

describe('snakeToTitleCase', () => {
  it('splits on underscore and lowercases the rest', () => {
    expect(snakeToTitleCase('hello_world')).toBe('Hello World');
    expect(snakeToTitleCase('USER_ID')).toBe('User Id');
    expect(snakeToTitleCase('single')).toBe('Single');
  });

  it('keeps empty segments from doubled underscores', () => {
    expect(snakeToTitleCase('a__b')).toBe('A  B');
  });

  it('THROWS on a non-string instead of console.error plus returning it', () => {
    // The version this replaced wrote to a global and returned its argument, and
    // documented neither.
    // @ts-expect-error deliberately wrong type
    expect(() => snakeToTitleCase(42)).toThrow(TypeError);
  });
});

describe('collapseWhitespace', () => {
  it('collapses rather than removes - the old name said the opposite', () => {
    expect(collapseWhitespace('a  b')).toBe('a b');
    expect(collapseWhitespace('a\n\tb')).toBe('a b');
  });

  it('does not trim, and the JSDoc says so', () => {
    expect(collapseWhitespace('  a  ')).toBe(' a ');
    expect(collapseWhitespace('  a  ').trim()).toBe('a');
  });
});

describe('insertTextEveryNWords', () => {
  it('breaks every N words with \\n by default, no trailing separator', () => {
    expect(insertTextEveryNWords('This is a long title', 2)).toBe(
      'This is\na long\ntitle'
    );
    expect(insertTextEveryNWords('a b c d', 2)).toBe('a b\nc d');
  });

  it('emits HTML only when the caller asks for it', () => {
    // The version this replaced defaulted to '<br>', so a string helper returned
    // markup that was only correct through innerHTML.
    expect(insertTextEveryNWords('This is a long title', 2, '<br>')).toBe(
      'This is<br>a long<br>title'
    );
    expect(insertTextEveryNWords('a b', 1)).not.toContain('<br>');
  });

  it('returns the input when there is nothing to break up', () => {
    expect(insertTextEveryNWords('a b', 2)).toBe('a b');
    expect(insertTextEveryNWords('a b c', 0)).toBe('a b c');
    expect(insertTextEveryNWords('a b c', -1)).toBe('a b c');
  });

  it('throws on a fractional group size', () => {
    expect(() => insertTextEveryNWords('a b c', 1.5)).toThrow(TypeError);
  });
});

describe('stringToSelector', () => {
  it('turns a class list into a compound selector', () => {
    expect(stringToSelector('ant-table')).toBe('.ant-table');
    expect(stringToSelector('a b')).toBe('.a.b');
    expect(stringToSelector('a   b')).toBe('.a.b');
  });

  it('escapes the Tailwind shapes the old version got WRONG', () => {
    // Measured 2026-10-01. Left column is what the previous implementation emitted.
    //   hover:bg-red-500  ->  .hover:bg-red-500   parsed as .hover + :bg-red-500
    //   w-1/2             ->  .w-1/2              invalid
    //   mt-1.5            ->  .mt-1.5             parsed as .mt-1 + .5
    //   2xl:flex          ->  .2xl:flex           class cannot start with a digit
    expect(stringToSelector('hover:bg-red-500')).toBe('.hover\\:bg-red-500');
    expect(stringToSelector('w-1/2')).toBe('.w-1\\/2');
    expect(stringToSelector('mt-1.5')).toBe('.mt-1\\.5');
    expect(stringToSelector('2xl:flex')).toBe('.\\32 xl\\:flex');
  });

  it('escapes brackets, parens and percent', () => {
    expect(stringToSelector('basis-[auto]')).toBe('.basis-\\[auto\\]');
    expect(stringToSelector('p-[calc(100%-2rem)]')).toBe(
      '.p-\\[calc\\(100\\%-2rem\\)\\]'
    );
  });

  it('leaves non-ASCII alone, as CSS.escape does', () => {
    expect(stringToSelector('lớp-đèn')).toBe('.lớp-đèn');
  });

  it('returns empty string, never a bare dot that would throw in querySelector', () => {
    expect(stringToSelector('')).toBe('');
    expect(stringToSelector('   ')).toBe('');
  });
});
