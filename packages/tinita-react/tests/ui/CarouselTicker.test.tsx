import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CarouselTicker } from '../../src/ui/carousel-ticker/CarouselTicker';

/**
 * jsdom không có `matchMedia`, không có `Element.animate`, và
 * `getBoundingClientRect` trả 0 hết. Không stub cả ba thì `stridePx` là 0,
 * effect thoát sớm, và mọi assertion về animation thành vô nghĩa mà vẫn xanh.
 */
let animateSpy: ReturnType<typeof vi.fn>;
let mediaListeners: Array<(e: MediaQueryListEvent) => void>;

function setReducedMotion(matches: boolean) {
  mediaListeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        mediaListeners.push(cb),
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))
  );
}

beforeEach(() => {
  animateSpy = vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    cancel: vi.fn(),
    finish: vi.fn(),
  }));
  Object.defineProperty(Element.prototype, 'animate', {
    value: animateSpy,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
    value: () => ({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CarouselTicker', () => {
  it('KHÔNG tạo animation nào khi prefers-reduced-motion: reduce', () => {
    // Đây là bug đã sửa. Marquee chạy bằng Web Animations API nên khối
    // `@media (prefers-reduced-motion)` trong CarouselTicker.css KHÔNG với tới nó -
    // khối đó có từ đầu và chưa bao giờ tắt được marquee. Phải tắt ở JS.
    setReducedMotion(true);
    render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    return waitFor(() => {
      expect(animateSpy).not.toHaveBeenCalled();
    });
  });

  it('có tạo animation khi user không yêu cầu giảm chuyển động', () => {
    // Chiều ngược. Thiếu ca này thì một ticker chưa bao giờ chạy cũng cho xanh ca trên.
    setReducedMotion(false);
    render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    return waitFor(() => {
      expect(animateSpy).toHaveBeenCalled();
    });
  });

  it('ghim content ở frame đầu khi reduced-motion, không để transform về 0', async () => {
    // Chỉ `cancel()` thì transform về 0 và các clone `aria-hidden` dẫn đường lọt
    // vào viewport thay cho pattern thật.
    setReducedMotion(true);
    const { container } = render(
      <CarouselTicker overflowBufferPx={200}>
        <span>alpha</span>
      </CarouselTicker>
    );
    const content = container.querySelector<HTMLElement>('.tnt-carousel-ticker-content');
    await waitFor(() => {
      expect(content?.style.transform).toBe('translateX(-200px)');
    });
  });

  it('biến thể đi qua data-attribute, không qua class Tailwind', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker direction="top" overflowVisible>
        <span>alpha</span>
      </CarouselTicker>
    );
    const root = container.querySelector('.tnt-carousel-ticker-root');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
    expect(root?.getAttribute('data-overflow')).toBe('visible');
    await waitFor(() => expect(animateSpy).toHaveBeenCalled());
  });

  it('KHÔNG dùng class Tailwind thô nào trong JSX', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker fade>
        <span>alpha</span>
      </CarouselTicker>
    );
    await waitFor(() => expect(animateSpy).toHaveBeenCalled());
    const classes = Array.from(container.querySelectorAll('*'))
      .flatMap((el) => Array.from(el.classList))
      .filter((c) => !c.startsWith('tnt-'));
    expect(classes).toEqual([]);
  });

  it('chỉ MỘT pattern không aria-hidden - phần còn lại là clone', async () => {
    setReducedMotion(false);
    const { container } = render(
      <CarouselTicker>
        <span>alpha</span>
      </CarouselTicker>
    );
    await waitFor(() => {
      const patterns = container.querySelectorAll('.tnt-carousel-ticker-pattern');
      expect(patterns.length).toBeGreaterThan(1);
      const visible = Array.from(patterns).filter((p) => p.getAttribute('aria-hidden') !== 'true');
      expect(visible).toHaveLength(1);
    });
  });
});
