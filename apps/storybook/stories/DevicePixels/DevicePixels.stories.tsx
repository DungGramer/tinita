import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { convertLength } from 'tinita/unit/convertLength';
import {
  fromDevicePixels,
  toDevicePixels,
} from 'tinita-dom/unit/toDevicePixels';

/**
 * Why there are two functions and not one.
 *
 * `convertLength` is pure: CSS fixes `1in = 96px = 25.4mm` by specification, so the
 * numbers in the left table are the same on every machine. Probing a `<div>` to
 * "measure DPI" cannot tell you anything - measured in Chromium at
 * `deviceScaleFactor` 1, 1.5, 2 and 3, a 100mm div is 378 layout pixels every time.
 *
 * `toDevicePixels` is where the display shows up. The two canvases below are the
 * same CSS size; the left one has a backing store sized in CSS pixels and the right
 * one in device pixels. On a retina screen the left is visibly blurry. That
 * difference is the whole reason the function exists, and no unit test can show it
 * to you.
 */
const SAMPLES = [
  [1, 'in'],
  [10, 'mm'],
  [1, 'cm'],
  [12, 'pt'],
  [1, 'pc'],
  [100, 'px'],
] as const;

const cell: React.CSSProperties = {
  padding: '5px 10px',
  borderBottom: '1px solid rgba(128,128,128,0.25)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 13,
  textAlign: 'right',
};

function paint(
  canvas: HTMLCanvasElement | null,
  scaled: boolean,
  cssSize: number
) {
  if (!canvas) return;
  const backing = scaled ? toDevicePixels(cssSize) : cssSize;
  canvas.width = backing;
  canvas.height = backing;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const ratio = backing / cssSize;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, cssSize, cssSize);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2563eb';
  for (let x = 0.5; x < cssSize; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssSize);
    ctx.stroke();
  }
  ctx.fillStyle = '#111827';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(`${backing}px store`, 6, cssSize - 8);
}

function Panel() {
  const plain = useRef<HTMLCanvasElement>(null);
  const sharp = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(
    typeof devicePixelRatio === 'number' ? devicePixelRatio : 1
  );
  const size = 140;

  useEffect(() => {
    paint(plain.current, false, size);
    paint(sharp.current, true, size);
  }, [ratio]);

  useEffect(() => {
    // The ratio changes when the window moves to another display or the user zooms.
    const query = matchMedia(`(resolution: ${ratio}dppx)`);
    const onChange = () => setRatio(devicePixelRatio);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, [ratio]);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <code>devicePixelRatio</code> here is <strong>{ratio}</strong>. Zoom the
        page with ctrl/cmd and +, or drag the window to another display, and
        this updates.
      </p>

      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <figure style={{ margin: 0 }}>
          <canvas
            ref={plain}
            style={{ width: size, height: size, border: '1px solid #d1d5db' }}
          />
          <figcaption style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
            Backing store in <strong>CSS</strong> pixels
          </figcaption>
        </figure>
        <figure style={{ margin: 0 }}>
          <canvas
            ref={sharp}
            style={{ width: size, height: size, border: '1px solid #d1d5db' }}
          />
          <figcaption style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
            Backing store in <strong>device</strong> pixels, via{' '}
            <code>toDevicePixels</code>
          </figcaption>
        </figure>
      </section>

      <section>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>
          Same input, two questions
        </h3>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left' }}>input</th>
              <th style={cell}>convertLength to px</th>
              <th style={cell}>toDevicePixels</th>
              <th style={cell}>back again</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLES.map(([value, unit]) => (
              <tr key={`${value}${unit}`}>
                <td style={{ ...cell, textAlign: 'left' }}>
                  {value}
                  {unit}
                </td>
                <td style={cell}>
                  {convertLength(value, unit, 'px').toFixed(3)}
                </td>
                <td style={cell}>{toDevicePixels(value, unit).toFixed(3)}</td>
                <td style={cell}>
                  {fromDevicePixels(toDevicePixels(value, unit), unit).toFixed(
                    3
                  )}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
          The middle column is the only one that moves when the ratio changes.
          Note that neither gives physical size: no browser reports the
          screen&rsquo;s real dimensions, so &ldquo;exactly one real-world
          inch&rdquo; is not achievable on the web.
        </p>
      </section>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/Device pixels',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const CssVersusDevicePixels: StoryObj<typeof meta> = {};
