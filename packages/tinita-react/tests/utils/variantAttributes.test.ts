import { describe, expect, it } from 'vitest';
import { variantAttributes } from '../../src/utils/variantAttributes';

describe('variantAttributes', () => {
  it('camelCase thành kebab-case', () => {
    expect(variantAttributes({ borderRadius: 'md' })).toEqual({
      'data-border-radius': 'md',
    });
  });

  it('boolean render TƯỜNG MINH true/false, không bỏ attribute', () => {
    // Khác quy ước Radix (`data-disabled` có/không) là CÓ CHỦ Ý: CSS ở đây có rule
    // thật cho `[data-indicator='false']` và `[data-show-arrow='false']`, bỏ attribute
    // khi false sẽ làm chúng chết âm thầm.
    expect(variantAttributes({ indicator: true, showArrow: false })).toEqual({
      'data-indicator': 'true',
      'data-show-arrow': 'false',
    });
  });

  it('undefined và null BỎ HẲN attribute - nghĩa là "theo chủ nhà"', () => {
    // Đây là cơ chế của `theme`: không truyền thì component theo dark mode của host;
    // truyền 'light' hay 'dark' là ép.
    expect(variantAttributes({ theme: undefined, other: null })).toEqual({});
  });

  it('số render được, kể cả 0', () => {
    // `data-level={0}` phải ra `"0"`. Nếu code dùng falsy check thì level 0 mất
    // attribute và `[data-level='0']` trong FileTree.module.css chết.
    expect(variantAttributes({ level: 0, size: 12 })).toEqual({
      'data-level': '0',
      'data-size': '12',
    });
  });

  it('chuỗi rỗng vẫn là giá trị, không phải "không quyết"', () => {
    expect(variantAttributes({ state: '' })).toEqual({ 'data-state': '' });
  });

  it('nhiều chữ hoa liên tiếp mỗi chữ một dấu gạch', () => {
    // Ghi lại hành vi thật chứ không phải mong đợi: `ariaLabelID` -> `data-aria-label-i-d`.
    // Không đẹp, nhưng prop của tinita không đặt tên kiểu đó, và làm thông minh hơn
    // thì phải đoán ranh giới từ viết tắt - đoán sai còn tệ hơn.
    expect(variantAttributes({ ariaLabelID: 'x' })).toEqual({
      'data-aria-label-i-d': 'x',
    });
  });

  it('không đụng gì khi input rỗng', () => {
    expect(variantAttributes({})).toEqual({});
  });
});
