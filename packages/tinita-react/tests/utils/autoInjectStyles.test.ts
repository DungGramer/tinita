import { afterEach, describe, expect, it } from 'vitest';
import { autoInjectStyles, removeInjectedStyles } from '../../src/utils/autoInjectStyles';

afterEach(() => {
  document.head.querySelectorAll('style[id^="tnt-test"]').forEach((n) => n.remove());
});

describe('autoInjectStyles', () => {
  it('inserts a style tag with the right id and content', () => {
    autoInjectStyles('tnt-test-a', '.x{color:red}');
    const tag = document.getElementById('tnt-test-a');
    expect(tag?.tagName).toBe('STYLE');
    expect(tag?.textContent).toBe('.x{color:red}');
  });

  it('calling twice does NOT duplicate the tag - this is the HMR case', () => {
    autoInjectStyles('tnt-test-b', '.x{color:red}');
    autoInjectStyles('tnt-test-b', '.x{color:blue}');
    expect(document.querySelectorAll('#tnt-test-b')).toHaveLength(1);
    // The second call is ignored entirely and does NOT update the content. Recorded
    // because it is surprising: edit the CSS, hot-reload, and see no change.
    expect(document.getElementById('tnt-test-b')?.textContent).toBe('.x{color:red}');
  });

  it('removeInjectedStyles removes the right tag and tolerates a missing id', () => {
    autoInjectStyles('tnt-test-c', '.x{color:red}');
    removeInjectedStyles('tnt-test-c');
    expect(document.getElementById('tnt-test-c')).toBeNull();
    expect(() => removeInjectedStyles('tnt-test-khong-ton-tai')).not.toThrow();
  });

  // Vị trí quyết định bên nào thắng cascade, và jsdom KHÔNG tính cascade - nó chỉ
  // nói được thẻ nằm ở đâu trong DOM. Phán quyết màu thật là ca L2
  // `auto-inject-styles-cascade`, chạy trong Chromium.
  it('inserts at the START of head, so a host stylesheet after it still wins', () => {
    const host = document.createElement('style');
    host.id = 'tnt-test-host';
    document.head.appendChild(host);
    autoInjectStyles('tnt-test-d', '.x{color:red}');
    expect(document.head.firstElementChild?.id).toBe('tnt-test-d');
    // Và host vẫn đứng sau nó, tức host thắng khi specificity bằng nhau.
    const ids = Array.from(document.head.children)
      .map((n) => n.id)
      .filter(Boolean);
    expect(ids.indexOf('tnt-test-d')).toBeLessThan(ids.indexOf('tnt-test-host'));
  });

  it('returns a remover for the tag it just injected', () => {
    const remove = autoInjectStyles('tnt-test-e', '.x{color:red}');
    expect(typeof remove).toBe('function');
    remove();
    expect(document.getElementById('tnt-test-e')).toBeNull();
    // Gọi lại không ném - cùng hợp đồng với removeInjectedStyles.
    expect(() => remove()).not.toThrow();
  });

  it('a second call returns a remover for the EXISTING tag, not a no-op', () => {
    autoInjectStyles('tnt-test-f', '.x{color:red}');
    const remove = autoInjectStyles('tnt-test-f', '.x{color:blue}');
    remove();
    expect(document.getElementById('tnt-test-f')).toBeNull();
  });

  // `check-assert-reuse` MÙ với việc không validate gì cả, nên ca này là cửa chặn
  // duy nhất: trước 2026-10-06 `autoInjectStyles(42, 'x')` tạo thẳng
  // `<style id="42">`, và `autoInjectStyles('id', '')` tạo một thẻ rỗng vô nghĩa.
  it('refuses a non-string or empty styleId and cssContent, naming itself', () => {
    expect(() => autoInjectStyles(42 as unknown as string, '.x{}')).toThrow(
      'autoInjectStyles: styleId must be a non-empty string, got number'
    );
    expect(() => autoInjectStyles('', '.x{}')).toThrow(
      'autoInjectStyles: styleId must be a non-empty string, got an empty string'
    );
    expect(() => autoInjectStyles('tnt-test-g', 42 as unknown as string)).toThrow(
      'autoInjectStyles: cssContent must be a non-empty string, got number'
    );
    expect(() => autoInjectStyles('tnt-test-g', '')).toThrow(
      'autoInjectStyles: cssContent must be a non-empty string, got an empty string'
    );
    expect(() => removeInjectedStyles(42 as unknown as string)).toThrow(
      'removeInjectedStyles: styleId must be a non-empty string, got number'
    );
  });
});
