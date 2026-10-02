import { describe, expect, it } from 'vitest';

import { fileSize } from '../src/file/fileSize';

describe('fileSize - the documented behaviour', () => {
  it('matches every JSDoc example', () => {
    expect(fileSize(1024)).toBe('1.02 KB');
    expect(fileSize(1024, 1024)).toBe('1 KB');
    expect(fileSize(0)).toBe('0 Byte');
  });
});

// Mỗi input dưới đây TRƯỚC ĐÂY trả về chuỗi "NaN undefined": Math.log của số âm là
// NaN, và sizes[NaN] là undefined. Chuỗi đó trông như một giá trị và render thẳng ra UI.
describe('fileSize - inputs that used to return the string "NaN undefined"', () => {
  it('rejects a negative size with TypeError, not RangeError', () => {
    expect(() => fileSize(-5)).toThrow(TypeError);
    expect(() => fileSize(-5)).toThrow(
      'fileSize: size must not be negative, got -5'
    );
  });

  it('rejects NaN, Infinity and a non-number', () => {
    expect(() => fileSize(Number.NaN)).toThrow(
      'fileSize: size must be a finite number, got NaN'
    );
    expect(() => fileSize(Number.POSITIVE_INFINITY)).toThrow(
      'fileSize: size must be a finite number, got Infinity'
    );
    expect(() => fileSize('x' as never)).toThrow(
      'fileSize: size must be a finite number, got string'
    );
    expect(() => fileSize(null as never)).toThrow(
      'fileSize: size must be a finite number, got object'
    );
  });

  // fileSize(1024, 2) trả "1 undefined": log2(1024) = 10, và danh sách đơn vị chỉ
  // có 9 phần tử nên sizes[10] là undefined.
  it('rejects a base outside the documented pair', () => {
    expect(() => fileSize(1024, 2 as never)).toThrow(
      'fileSize: base must be 1000 or 1024, got 2'
    );
    expect(() => fileSize(1024, 999 as never)).toThrow(
      'fileSize: base must be 1000 or 1024, got 999'
    );
  });
});
