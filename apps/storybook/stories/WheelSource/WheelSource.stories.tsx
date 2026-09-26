import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import {
  WHEEL_GESTURE_IDLE_MS,
  WHEEL_SAMPLE_COUNT,
  classifyWheelSource,
  decisiveWheelSource,
  provisionalWheelSource,
  type WheelSample,
  type WheelSource,
} from 'tinita-dom/wheel-source';

/**
 * `classifyWheelSource` là hàm thuần, nên story ở đây là một dụng cụ đo: lăn chuột
 * hoặc quét trackpad lên khung và xem nó phân loại ra gì với dữ liệu thật của
 * thiết bị bạn đang cầm. Đây là thứ unit test không nói được - nó chỉ nói hàm
 * đúng với mẫu đã ghi.
 */
function Probe() {
  const samples = useRef<WheelSample[]>([]);
  const lastTime = useRef(0);
  const [rows, setRows] = useState<
    Array<{
      delta: number;
      gap: number;
      verdict: WheelSource | null;
      decisive: WheelSource | null;
    }>
  >([]);
  const [verdict, setVerdict] = useState<WheelSource | null>(null);
  const [gestures, setGestures] = useState(0);

  const onWheel = (event: React.WheelEvent) => {
    const gap = lastTime.current ? event.timeStamp - lastTime.current : 0;
    if (gap > WHEEL_GESTURE_IDLE_MS) {
      samples.current = [];
      setGestures((n) => n + 1);
    }
    lastTime.current = event.timeStamp;
    samples.current.push({ time: event.timeStamp, delta: event.deltaY });
    if (samples.current.length > 64) samples.current.shift();

    const v = classifyWheelSource(samples.current);
    setVerdict(v ?? provisionalWheelSource(event.deltaY));
    setRows((prev) =>
      [
        {
          delta: Math.round(event.deltaY * 100) / 100,
          gap: Math.round(gap),
          verdict: v,
          decisive: decisiveWheelSource(event.deltaY),
        },
        ...prev,
      ].slice(0, 12)
    );
  };

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 620, fontSize: 13 }}>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        Lăn chuột hoặc quét trackpad lên khung dưới. Cần{' '}
        <strong>{WHEEL_SAMPLE_COUNT} mẫu</strong> mới có phán quyết chắc chắn;
        trước đó dùng <code>provisionalWheelSource</code>. Khoảng nghỉ quá{' '}
        <strong>{WHEEL_GESTURE_IDLE_MS}ms</strong> là một gesture mới và buffer
        được xoá.
      </p>
      <div
        onWheel={onWheel}
        style={{
          height: 120,
          display: 'grid',
          placeItems: 'center',
          border: '2px dashed #bbb',
          borderRadius: 8,
          userSelect: 'none',
        }}
      >
        <span>
          gesture #{gestures} · mẫu: {samples.current.length} · phán quyết:{' '}
          <strong>{verdict ?? '(chưa có)'}</strong>
        </span>
      </div>
      <table
        style={{
          borderCollapse: 'collapse',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '4px 8px' }}>deltaY</th>
            <th style={{ padding: '4px 8px' }}>gap (ms)</th>
            <th style={{ padding: '4px 8px' }}>classify</th>
            <th style={{ padding: '4px 8px' }}>decisive</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '4px 8px' }}>{r.delta}</td>
              <td style={{ padding: '4px 8px' }}>{r.gap}</td>
              <td style={{ padding: '4px 8px' }}>{r.verdict ?? '—'}</td>
              <td style={{ padding: '4px 8px' }}>{r.decisive ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/classifyWheelSource',
  component: Probe,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Phân loại nguồn wheel event: chuột theo bước (stepped) hay trackpad (smoothed). Phán quyết bị khoá trong suốt một gesture - đổi ý giữa gesture chính là nguyên nhân của cú giật đã báo 2026-09-10.',
      },
    },
  },
} satisfies Meta<typeof Probe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Probe_: Story = { name: 'Dụng cụ đo' };
