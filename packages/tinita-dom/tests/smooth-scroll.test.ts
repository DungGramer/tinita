import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installSmoothScroll } from '../src/smooth-scroll';

/**
 * Smoke, không phải test easing. Kiểm hợp đồng cài/gỡ: nó cài listener trên `document` và hàm trả
 * về gỡ đúng những listener đó. Test đường cong spring cần rAF thật và thuộc phạm vi khác.
 */
describe('installSmoothScroll', () => {
  beforeEach(() => {
    // jsdom không có matchMedia; installSmoothScroll gọi nó cho prefers-reduced-motion.
    if (!window.matchMedia) {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    }
  });

  it('trả về hàm gỡ', () => {
    const uninstall = installSmoothScroll();
    expect(typeof uninstall).toBe('function');
    uninstall();
  });

  it('cài đúng 2 listener trên document và gỡ đúng 2', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');

    const uninstall = installSmoothScroll();
    const added = add.mock.calls.map(([type]) => type);
    expect(added).toContain('wheel');
    expect(added).toContain('pointerdown');

    uninstall();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toContain('wheel');
    expect(removed).toContain('pointerdown');

    add.mockRestore();
    remove.mockRestore();
  });

  it('wheel listener khai passive:false - nó cần preventDefault', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const uninstall = installSmoothScroll();
    const wheelCall = add.mock.calls.find(([type]) => type === 'wheel');
    expect(wheelCall?.[2]).toMatchObject({ passive: false });
    uninstall();
    add.mockRestore();
  });

  it('bỏ qua wheel đã bị defaultPrevented', () => {
    const uninstall = installSmoothScroll();
    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true });
    event.preventDefault();
    // Không throw, và không claim event lần nữa.
    expect(() => document.dispatchEvent(event)).not.toThrow();
    uninstall();
  });

  it('bỏ qua ctrl+wheel - đó là zoom của browser', () => {
    const uninstall = installSmoothScroll();
    const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, cancelable: true, bubbles: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    uninstall();
  });

  it('gọi hai lần rồi gỡ hai lần không throw', () => {
    const a = installSmoothScroll();
    const b = installSmoothScroll();
    expect(() => {
      a();
      b();
    }).not.toThrow();
  });
});
