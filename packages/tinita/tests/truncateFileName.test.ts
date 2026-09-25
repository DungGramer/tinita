import { describe, expect, it } from 'vitest';

import { getFileNameParts } from '../src/file/getFileNameParts';
import { truncateFileName } from '../src/file/truncateFileName';
import { truncateFileNameParts } from '../src/file/truncateFileNameParts';

const LONG = 'very-long-document-name.pdf'; // 27 ký tự, name 23 + '.pdf'

describe('truncateFileName - không cần truncate', () => {
  it('trả nguyên chuỗi khi đã vừa maxLength', () => {
    expect(truncateFileName('document.pdf')).toBe('document.pdf');
  });

  it('trả nguyên chuỗi khi dài đúng bằng maxLength', () => {
    expect(truncateFileName('a.pdf', { maxLength: 5 })).toBe('a.pdf');
  });

  it('chuỗi rỗng', () => {
    expect(truncateFileName('', { maxLength: 5 })).toBe('');
  });

  it('LONG dài 27 < default maxLength 30 nên không bị cắt', () => {
    expect(LONG.length).toBe(27);
    expect(truncateFileName(LONG)).toBe(LONG);
  });
});

describe('truncateFileName - truncate cơ bản', () => {
  it('giữ extension và suffix, tôn trọng maxLength', () => {
    const got = truncateFileName(LONG, { maxLength: 20 });
    expect(got).toBe('very-long-...ame.pdf');
    expect(got.length).toBe(20);
  });

  it('preservedSuffixLength tăng thì suffix dài ra', () => {
    const got = truncateFileName(LONG, {
      maxLength: 24,
      preservedSuffixLength: 5,
    });
    expect(got).toBe('very-long-do...-name.pdf');
    expect(got.length).toBe(24);
  });

  it('ellipsis tuỳ biến', () => {
    const got = truncateFileName(LONG, { maxLength: 20, ellipsis: '…' });
    expect(got).toBe('very-long-do…ame.pdf');
    expect(got.length).toBe(20);
  });

  it('ellipsis rỗng', () => {
    expect(truncateFileName(LONG, { maxLength: 20, ellipsis: '' })).toBe(
      'very-long-docame.pdf'
    );
  });

  it('preservedSuffixLength lớn hơn chỗ trống thì bị giảm tự động', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      preservedSuffixLength: 20,
    });
    expect(got).toBe('v...ocument-name.pdf');
    expect(got.length).toBe(20);
  });

  it('file không có extension', () => {
    expect(truncateFileName('very-long-document-name', { maxLength: 15 })).toBe(
      'very-long...ame'
    );
  });

  it('tên nhiều dấu chấm - chỉ đoạn sau dấu chấm cuối là extension', () => {
    expect(
      truncateFileName('my.archive.backup.tar.gz', { maxLength: 15 })
    ).toBe('my.arc...tar.gz');
  });
});

describe('truncateFileName - fallback khi maxLength quá nhỏ', () => {
  it('bỏ ellipsis, giữ tối đa prefix', () => {
    const got = truncateFileName(LONG, { maxLength: 10, minPrefixLength: 3 });
    expect(got).toBe('very-l.pdf');
    expect(got.length).toBe(10);
  });

  it('minPrefixLength lớn bất khả thi vẫn ra kết quả đúng maxLength', () => {
    const got = truncateFileName(LONG, { maxLength: 20, minPrefixLength: 999 });
    expect(got.length).toBe(20);
  });

  it('ellipsis dài hơn chỗ trống thì bị bỏ hẳn', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      ellipsis: 'x'.repeat(30),
    });
    expect(got.length).toBe(20);
  });

  it('không extension, maxLength nhỏ', () => {
    expect(truncateFileName('abcdefghij', { maxLength: 4 })).toBe('abcd');
  });
});

describe('truncateFileNameParts', () => {
  it('trả object khi thực sự truncate', () => {
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

  it('parts ghép lại bằng đúng chuỗi của truncateFileName', () => {
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

/** Từng là lỗi, đã vá. Giữ lại làm chốt chặn hồi quy. */
describe('hồi quy - các lỗi đã vá', () => {
  // Từng là: return sớm chạy trước khi xét `output`, nên trả string thay vì object;
  // nhánh đáng lẽ xử lý việc đó là dead code. Nay parts là hàm riêng, không còn cờ `output`.
  it('parts trả object cả khi KHÔNG cần truncate', () => {
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

  // L176 truyền extension vào tham số `suffix`, nhưng createOutput (L171)
  // luôn nối thêm extensionWithDot -> extension xuất hiện 2 lần.
  it('maxLength <= độ dài extension: giữ phần cuối extension, không nhân đôi', () => {
    expect(truncateFileName('a.pdf', { maxLength: 3 })).toBe('pdf');
    expect(truncateFileName('a.pdf', { maxLength: 4 })).toBe('.pdf');
    expect(truncateFileName('a.pdf', { maxLength: 1 })).toBe('f');
    expect(truncateFileName('a.pdf', { maxLength: 0 })).toBe('');
  });

  it('maxLength <= độ dài extension: kết quả phải tôn trọng maxLength', () => {
    for (const maxLength of [0, 1, 3, 4]) {
      expect(
        truncateFileName('a.pdf', { maxLength }).length
      ).toBeLessThanOrEqual(Math.max(maxLength, 0));
    }
  });

  // L187 `nameWithoutExt.slice(-suffixLength)`; slice(-0) === slice(0) -> trả CẢ chuỗi.
  it('preservedSuffixLength:0 - slice(-0) không trả cả tên file', () => {
    const got = truncateFileName(LONG, {
      maxLength: 20,
      preservedSuffixLength: 0,
    });
    expect(got).toBe('very-long-doc....pdf');
    expect(got.length).toBe(20);
  });

  // maxLength âm không bị chặn, rơi vào nhánh L176.
  it('maxLength âm và NaN bị kẹp về 0', () => {
    expect(truncateFileName(LONG, { maxLength: -5 })).toBe('');
    expect(truncateFileName(LONG, { maxLength: Number.NaN })).toBe('');
  });

  it('maxLength Infinity nghĩa là không cắt', () => {
    expect(
      truncateFileName(LONG, { maxLength: Number.POSITIVE_INFINITY })
    ).toBe(LONG);
  });

  // getFileNameParts('.gitignore') => ['', 'gitignore'] nên dotfile bị coi là
  // "không có tên, extension = gitignore". Cộng với lỗi nhân đôi extension.
  it('dotfile: .gitignore phải là tên file, không phải extension', () => {
    expect(getFileNameParts('.gitignore')).toEqual(['.gitignore', '']);
  });

  it('dotfile: truncate .gitignore tôn trọng maxLength', () => {
    expect(truncateFileName('.gitignore', { maxLength: 8 })).toBe('.g...ore');
  });

  // .length và .slice làm việc trên UTF-16 code unit, cắt giữa surrogate pair.
  it('emoji không được bị cắt thành surrogate lẻ', () => {
    const got = truncateFileName('\u{1F389}'.repeat(8) + '.png', {
      maxLength: 12,
    });
    expect(got).not.toMatch(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
    );
  });
});

/**
 * Bất biến: đúng với MỌI tổ hợp, không chỉ case đã nghĩ ra.
 * Đây là phần bắt được lỗi slice(-0), nhân đôi extension và surrogate lẻ.
 */
describe('bất biến trên mọi tổ hợp', () => {
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

  it('kết quả LUÔN <= maxLength', () => {
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

  it('parts ghép lại === dạng string', () => {
    for (const fileName of inputs) {
      for (const maxLength of limits) {
        const parts = truncateFileNameParts(fileName, { maxLength });
        expect(
          `${parts.prefix}${parts.ellipsis}${parts.suffix}${parts.extensionWithDot}`
        ).toBe(truncateFileName(fileName, { maxLength }));
      }
    }
  });

  it('truncated=false thì dựng lại đúng input', () => {
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

  it('không bao giờ sinh surrogate lẻ', () => {
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

  it('name + extension dựng lại đúng input với mọi tên', () => {
    for (const fileName of inputs) {
      const [name, extension] = getFileNameParts(fileName);
      expect(name + (extension ? `.${extension}` : '')).toBe(fileName);
    }
  });
});
