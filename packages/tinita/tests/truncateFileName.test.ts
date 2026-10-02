import { describe, expect, it } from 'vitest';

import { getFileNameParts } from '../src/file/getFileNameParts';
import { truncateFileName } from '../src/file/truncateFileName';
import { truncateFileNameParts } from '../src/file/truncateFileNameParts';

const LONG = 'very-long-document-name.pdf'; // 27 ký tự, name 23 + '.pdf'

describe('truncateFileName - no truncation needed', () => {
  it('returns the string unchanged when it already fits maxLength', () => {
    expect(truncateFileName('document.pdf')).toBe('document.pdf');
  });

  it('returns the string unchanged when it is exactly maxLength', () => {
    expect(truncateFileName('a.pdf', { maxLength: 5 })).toBe('a.pdf');
  });

  it('chuỗi rỗng', () => {
    expect(truncateFileName('', { maxLength: 5 })).toBe('');
  });

  it('LONG is 27 chars < the default maxLength of 30, so it is not cut', () => {
    expect(LONG.length).toBe(27);
    expect(truncateFileName(LONG)).toBe(LONG);
  });
});

describe('truncateFileName - basic truncation', () => {
  it('keeps the extension and suffix while respecting maxLength', () => {
    const got = truncateFileName(LONG, { maxLength: 20 });
    expect(got).toBe('very-long-...ame.pdf');
    expect(got.length).toBe(20);
  });

  it('a larger preservedSuffixLength makes the suffix longer', () => {
    const got = truncateFileName(LONG, {
      maxLength: 24,
      preservedSuffixLength: 5,
    });
    expect(got).toBe('very-long-do...-name.pdf');
    expect(got.length).toBe(24);
  });

  it('custom ellipsis', () => {
    const got = truncateFileName(LONG, { maxLength: 20, ellipsis: '…' });
    expect(got).toBe('very-long-do…ame.pdf');
    expect(got.length).toBe(20);
  });

  it('ellipsis rỗng', () => {
    expect(truncateFileName(LONG, { maxLength: 20, ellipsis: '' })).toBe(
      'very-long-docame.pdf'
    );
  });

  it('a preservedSuffixLength larger than the available room is reduced automatically', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      preservedSuffixLength: 20,
    });
    expect(got).toBe('v...ocument-name.pdf');
    expect(got.length).toBe(20);
  });

  it('a file with no extension', () => {
    expect(truncateFileName('very-long-document-name', { maxLength: 15 })).toBe(
      'very-long...ame'
    );
  });

  it('a name with several dots - only the part after the last dot is the extension', () => {
    expect(
      truncateFileName('my.archive.backup.tar.gz', { maxLength: 15 })
    ).toBe('my.arc...tar.gz');
  });
});

describe('truncateFileName - fallback when maxLength is too small', () => {
  it('drops the ellipsis and keeps as much prefix as possible', () => {
    const got = truncateFileName(LONG, { maxLength: 10, minPrefixLength: 3 });
    expect(got).toBe('very-l.pdf');
    expect(got.length).toBe(10);
  });

  it('an impossibly large minPrefixLength still yields a result of exactly maxLength', () => {
    const got = truncateFileName(LONG, { maxLength: 20, minPrefixLength: 999 });
    expect(got.length).toBe(20);
  });

  it('an ellipsis longer than the available room is dropped entirely', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      ellipsis: 'x'.repeat(30),
    });
    expect(got.length).toBe(20);
  });

  it('no extension, small maxLength', () => {
    expect(truncateFileName('abcdefghij', { maxLength: 4 })).toBe('abcd');
  });
});

describe('truncateFileNameParts', () => {
  it('returns an object when truncation actually happens', () => {
    expect(truncateFileNameParts(LONG, { maxLength: 20 })).toEqual({
      prefix: 'very-long-',
      ellipsis: '...',
      suffix: 'ame',
      extensionWithDot: '.pdf',
      name: 'very-long-document-name',
      extension: 'pdf',
      truncated: true,
    });
  });

  it('the parts join back into exactly the string truncateFileName returns', () => {
    const cfg = { maxLength: 20 } as const;
    const p = truncateFileNameParts(LONG, cfg);
    expect(`${p.prefix}${p.ellipsis}${p.suffix}${p.extensionWithDot}`).toBe(
      truncateFileName(LONG, cfg)
    );
  });
});

describe('getFileNameParts', () => {
  it.each([
    ['document.pdf', ['document', 'pdf']],
    ['my.file.txt', ['my.file', 'txt']],
    ['noextension', ['noextension', '']],
    ['', ['', '']],
  ])('%s', (input, expected) => {
    expect(getFileNameParts(input as string)).toEqual(expected);
  });
});

/** All were real bugs, all fixed. Kept as regression gates. */
describe('regression - fixed bugs', () => {
  // Used to be: the early return ran before `output` was considered, so it returned
  // a string instead of an object; the branch meant to handle it was dead code. parts
  // is its own function now, with no `output` flag.
  it('parts returns an object even when NO truncation is needed', () => {
    expect(truncateFileNameParts('a.pdf', { maxLength: 30 })).toEqual({
      prefix: 'a',
      ellipsis: '',
      suffix: '',
      extensionWithDot: '.pdf',
      name: 'a',
      extension: 'pdf',
      truncated: false,
    });
  });

  // L176 passed the extension into the `suffix` parameter, but createOutput (L171)
  // always appends extensionWithDot -> the extension appeared twice.
  it('maxLength <= extension length: keeps the extension tail without duplicating it', () => {
    expect(truncateFileName('a.pdf', { maxLength: 3 })).toBe('pdf');
    expect(truncateFileName('a.pdf', { maxLength: 4 })).toBe('.pdf');
    expect(truncateFileName('a.pdf', { maxLength: 1 })).toBe('f');
    expect(truncateFileName('a.pdf', { maxLength: 0 })).toBe('');
  });

  it('maxLength <= extension length: the result must respect maxLength', () => {
    for (const maxLength of [0, 1, 3, 4]) {
      expect(
        truncateFileName('a.pdf', { maxLength }).length
      ).toBeLessThanOrEqual(Math.max(maxLength, 0));
    }
  });

  // L187 `nameWithoutExt.slice(-suffixLength)`; slice(-0) === slice(0) -> returns the
  // WHOLE string.
  it('preservedSuffixLength:0 - slice(-0) must not return the entire file name', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      preservedSuffixLength: 0,
    });
    expect(got).toBe('very-long-doc....pdf');
    expect(got.length).toBe(20);
  });

  // A negative maxLength was not guarded and fell into the L176 branch.
  it('a negative maxLength and NaN are clamped to 0', () => {
    expect(truncateFileName(LONG, { maxLength: -5 })).toBe('');
    expect(truncateFileName(LONG, { maxLength: Number.NaN })).toBe('');
  });

  it('maxLength Infinity means no cutting', () => {
    expect(
      truncateFileName(LONG, { maxLength: Number.POSITIVE_INFINITY })
    ).toBe(LONG);
  });

  // getFileNameParts('.gitignore') => ['', 'gitignore'], so a dotfile was read as
  // "no name, extension = gitignore". Compounded by the duplicated-extension bug.
  it('dotfile: .gitignore must be a file name, not an extension', () => {
    expect(getFileNameParts('.gitignore')).toEqual(['.gitignore', '']);
  });

  it('dotfile: truncating .gitignore respects maxLength', () => {
    expect(truncateFileName('.gitignore', { maxLength: 8 })).toBe('.g...ore');
  });

  // .length and .slice work on UTF-16 code units and cut through surrogate pairs.
  it('an emoji must not be cut into a lone surrogate', () => {
    const got = truncateFileName('\u{1F389}'.repeat(8) + '.png', {
      maxLength: 12,
    });
    expect(got).not.toMatch(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    );
  });
});

/**
 * Invariants: true for EVERY combination, not just the cases someone thought of.
 * This is the part that caught the slice(-0) bug, the duplicated extension and the
 * lone surrogate.
 */
describe('invariants across every combination', () => {
  const inputs = [
    'document.pdf',
    'very-long-document-name.pdf',
    '.gitignore',
    '.env.local',
    'trailing.',
    'noext',
    'my.archive.backup.tar.gz',
    '',
    '\u{1F389}\u{1F389}\u{1F389}\u{1F389}\u{1F389}\u{1F389}\u{1F389}\u{1F389}.png',
    'a.pdf',
  ];
  const limits = [0, 1, 2, 3, 4, 5, 8, 10, 12, 15, 20, 24, 30, 100];

  it('the result is ALWAYS <= maxLength', () => {
    for (const fileName of inputs) {
      for (const maxLength of limits) {
        for (const preservedSuffixLength of [0, 1, 3, 5, 20]) {
          for (const ellipsis of ['...', '', '\u2026']) {
            const got = truncateFileName(fileName, {
              maxLength,
              preservedSuffixLength,
              ellipsis,
            });
            expect(
              got.length,
              `${JSON.stringify(fileName)} max=${maxLength} sfx=${preservedSuffixLength} ell=${JSON.stringify(ellipsis)} -> ${JSON.stringify(got)}`
            ).toBeLessThanOrEqual(maxLength);
          }
        }
      }
    }
  });

  it('the joined parts === the string form', () => {
    for (const fileName of inputs) {
      for (const maxLength of limits) {
        const parts = truncateFileNameParts(fileName, { maxLength });
        expect(
          `${parts.prefix}${parts.ellipsis}${parts.suffix}${parts.extensionWithDot}`
        ).toBe(truncateFileName(fileName, { maxLength }));
      }
    }
  });

  it('truncated=false reconstructs the input exactly', () => {
    for (const fileName of inputs) {
      for (const maxLength of limits) {
        const parts = truncateFileNameParts(fileName, { maxLength });
        if (!parts.truncated) {
          expect(
            `${parts.prefix}${parts.ellipsis}${parts.suffix}${parts.extensionWithDot}`
          ).toBe(fileName);
        }
      }
    }
  });

  it('never produces a lone surrogate', () => {
    const lone =
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    for (const maxLength of limits) {
      for (const preservedSuffixLength of [0, 1, 3, 5]) {
        const got = truncateFileName('\u{1F389}'.repeat(8) + '.png', {
          maxLength,
          preservedSuffixLength,
        });
        expect(
          got,
          `max=${maxLength} sfx=${preservedSuffixLength} -> ${JSON.stringify(got)}`
        ).not.toMatch(lone);
      }
    }
  });

  it('name + extension reconstructs the input for every name', () => {
    for (const fileName of inputs) {
      const [name, extension] = getFileNameParts(fileName);
      expect(name + (extension ? `.${extension}` : '')).toBe(fileName);
    }
  });
});

// Trước khi có assertString, cả ba boundary này ném TypeError vô danh
// ("t.lastIndexOf is not a function"), và getFileNameParts(0) / (null) còn trả
// ["",""] im lặng vì điều kiện `!fileName`.
describe('the three file-name boundaries each name themselves', () => {
  it('getFileNameParts rejects a non-string', () => {
    expect(() => getFileNameParts(42 as never)).toThrow(TypeError);
    expect(() => getFileNameParts(42 as never)).toThrow(
      'getFileNameParts: fileName must be a string, got number'
    );
    expect(() => getFileNameParts(0 as never)).toThrow(
      'getFileNameParts: fileName must be a string, got number'
    );
    expect(() => getFileNameParts(null as never)).toThrow(
      'getFileNameParts: fileName must be a string, got object'
    );
  });

  it('getFileNameParts still accepts the empty string, as documented', () => {
    expect(getFileNameParts('')).toEqual(['', '']);
  });

  // Nếu chỉ getFileNameParts assert thì hai hàm dưới sẽ nêu tên hàm người gọi
  // chưa từng gọi - đúng thứ tham số `caller` sinh ra để loại bỏ.
  it('truncateFileNameParts names itself, not getFileNameParts', () => {
    expect(() => truncateFileNameParts(42 as never)).toThrow(
      'truncateFileNameParts: fileName must be a string, got number'
    );
  });

  it('truncateFileName names itself, not truncateFileNameParts', () => {
    expect(() => truncateFileName(42 as never)).toThrow(
      'truncateFileName: fileName must be a string, got number'
    );
    expect(() => truncateFileName(null as never)).toThrow(
      'truncateFileName: fileName must be a string, got object'
    );
  });
});
