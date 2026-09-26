import { afterEach, describe, expect, it } from 'vitest';
import { autoInjectStyles, removeInjectedStyles } from '../../src/utils/autoInjectStyles';

afterEach(() => {
  document.head.querySelectorAll('style[id^="tnt-test"]').forEach((n) => n.remove());
});

describe('autoInjectStyles', () => {
  it('chèn một style tag mang đúng id và nội dung', () => {
    autoInjectStyles('tnt-test-a', '.x{color:red}');
    const tag = document.getElementById('tnt-test-a');
    expect(tag?.tagName).toBe('STYLE');
    expect(tag?.textContent).toBe('.x{color:red}');
  });

  it('gọi hai lần KHÔNG nhân đôi tag - đây là ca HMR', () => {
    autoInjectStyles('tnt-test-b', '.x{color:red}');
    autoInjectStyles('tnt-test-b', '.x{color:blue}');
    expect(document.querySelectorAll('#tnt-test-b')).toHaveLength(1);
    // Lần thứ hai bị bỏ qua hoàn toàn, KHÔNG cập nhật nội dung. Ghi lại vì đây là
    // hành vi dễ gây bất ngờ: đổi CSS rồi hot-reload sẽ không thấy thay đổi.
    expect(document.getElementById('tnt-test-b')?.textContent).toBe('.x{color:red}');
  });

  it('removeInjectedStyles gỡ đúng tag và chịu được id không tồn tại', () => {
    autoInjectStyles('tnt-test-c', '.x{color:red}');
    removeInjectedStyles('tnt-test-c');
    expect(document.getElementById('tnt-test-c')).toBeNull();
    expect(() => removeInjectedStyles('tnt-test-khong-ton-tai')).not.toThrow();
  });
});
