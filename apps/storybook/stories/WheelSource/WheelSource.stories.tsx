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
 * `classifyWheelSource` is a pure function, so the story here is an instrument:
 * scroll a mouse wheel or swipe a trackpad over the frame and watch how it
 * classifies the real data from the device in your hand. This is what a unit test
 * cannot tell you - a unit test only says the function agrees with recorded
 * samples.
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
        Scroll a mouse wheel or swipe a trackpad over the frame below. It takes{' '}
        <strong>{WHEEL_SAMPLE_COUNT} samples</strong> to reach a confident
        verdict; before that <code>provisionalWheelSource</code> is used. A
        pause longer than <strong>{WHEEL_GESTURE_IDLE_MS}ms</strong> starts a
        new gesture and clears the buffer.
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
          gesture #{gestures} · samples: {samples.current.length} · verdict:{' '}
          <strong>{verdict ?? '(none yet)'}</strong>
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
              <td style={{ padding: '4px 8px' }}>{r.verdict ?? '-'}</td>
              <td style={{ padding: '4px 8px' }}>{r.decisive ?? '-'}</td>
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
          'Classifies the source of a wheel event: a stepped mouse wheel or a smoothed trackpad. The verdict is locked for the duration of a gesture - changing its mind mid-gesture was the cause of the jank reported 2026-09-10.',
      },
    },
  },
} satisfies Meta<typeof Probe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Probe_: Story = { name: 'Instrument' };
