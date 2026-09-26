import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { installSmoothScroll } from 'tinita-dom/smooth-scroll';

/**
 * `installSmoothScroll` không phải component - nó cài listener lên `document` và
 * trả về hàm gỡ. Story dựng lại đúng cách dùng thật: gọi MỘT lần, và gỡ khi
 * unmount. Effect của StrictMode chạy hai lần, nên không gỡ là cài hai lần.
 */
function Demo({ enabled }: { enabled: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    return installSmoothScroll();
  }, [enabled]);

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        Cuộn bằng con lăn chuột trong khung dưới. Trackpad đi theo đường native,
        chuột có nút cuộn theo bước thì được ease -{' '}
        <code>classifyWheelSource</code> quyết định, và quyết định đó bị khoá
        trong suốt một gesture.
      </p>
      <p style={{ margin: 0, fontSize: 13 }}>
        <strong>installSmoothScroll:</strong> {enabled ? 'đang cài' : 'đã gỡ'}
        {' · '}
        <strong>prefers-reduced-motion:</strong>{' '}
        {reduced ? 'reduce' : 'no-preference'}
        {reduced && ' → easing bị bỏ hẳn, không phải làm nhanh hơn'}
      </p>
      <div
        ref={boxRef}
        data-smooth-scroll-demo
        style={{
          height: 260,
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 12,
        }}
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            style={{ padding: '10px 4px', borderBottom: '1px solid #f0f0f0' }}
          >
            Dòng {i + 1}
          </div>
        ))}
      </div>
      <div
        data-no-smooth-scroll
        style={{
          height: 140,
          overflowY: 'auto',
          border: '1px dashed #bbb',
          borderRadius: 8,
          padding: 12,
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 12 }}>
          Khung này mang <code>data-no-smooth-scroll</code> nên luôn cuộn
          native, kể cả khi đã cài.
        </p>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{ padding: '8px 4px' }}>
            Dòng {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/installSmoothScroll',
  component: Demo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Smooth scroll cho chuột có nút cuộn theo bước, giữ nguyên native cho trackpad. Browser-only, không có SSR guard - gọi nó trên server là lỗi của người gọi.',
      },
    },
  },
  argTypes: {
    enabled: { control: 'boolean', description: 'Cài hay gỡ listener' },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Installed: Story = { args: { enabled: true } };
export const NotInstalled: Story = { args: { enabled: false } };
