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
});
