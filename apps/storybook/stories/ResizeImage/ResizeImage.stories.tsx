import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { resizeImage } from 'tinita-dom/image/resizeImage';

/**
 * Pick a photo from your own disk and compare the two sides.
 *
 * Two things only a browser can show you:
 *
 * - **EXIF orientation is ignored.** Drop in a photo taken with a phone held
 *   sideways. The `<img>` on the left renders it upright because the browser applies
 *   the orientation tag when displaying; the canvas on the right sees the stored
 *   pixels and comes back rotated. That is the canvas&rsquo;s behaviour, not a defect
 *   here - fixing it would mean parsing EXIF. Use
 *   `createImageBitmap(blob, { imageOrientation: 'from-image' })` first if it matters.
 * - **A cross-origin source taints the canvas** and `toDataURL` throws a
 *   `SecurityError`. Paste a URL from another site into the field to see the rejection
 *   message rather than a silent empty result.
 */
const SAMPLE =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
      <rect width="320" height="200" fill="#1e293b"/>
      <circle cx="90" cy="100" r="56" fill="#38bdf8"/>
      <rect x="170" y="44" width="112" height="112" fill="#fbbf24"/>
      <text x="16" y="186" fill="#f8fafc" font-family="monospace" font-size="15">320 x 200</text>
    </svg>`
  );

function Panel() {
  const [source, setSource] = useState(SAMPLE);
  const [scale, setScale] = useState(2);
  const [type, setType] = useState('image/png');
  const [quality, setQuality] = useState(0.8);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    resizeImage(source, {
      scale,
      type,
      quality: type === 'image/png' ? undefined : quality,
    })
      .then((result) => {
        if (active) setOutput(result);
      })
      .catch((thrown: Error) => {
        if (active) {
          setOutput('');
          setError(thrown.message);
        }
      });

    return () => {
      active = false;
    };
  }, [source, scale, type, quality]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
          Your own photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>
        <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
          scale: {scale}
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
          />
        </label>
        <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
          type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="image/png">image/png</option>
            <option value="image/jpeg">image/jpeg</option>
            <option value="image/webp">image/webp</option>
          </select>
        </label>
        {type !== 'image/png' ? (
          <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
            quality: {quality}
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
            />
          </label>
        ) : null}
      </div>

      <label style={{ fontSize: 13, display: 'grid', gap: 4 }}>
        or a URL - try one from another origin to see the SecurityError
        <input
          value={source.startsWith('data:') ? '' : source}
          placeholder="https://..."
          onChange={(event) => setSource(event.target.value || SAMPLE)}
          style={{
            padding: 6,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
          }}
        />
      </label>

      {error ? (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: '#b91c1c',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          rejected: {error}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <figure style={{ margin: 0 }}>
          <img
            src={source}
            alt="source"
            style={{ maxWidth: 320, border: '1px solid #d1d5db' }}
          />
          <figcaption style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
            source, as the browser displays it (EXIF applied)
          </figcaption>
        </figure>
        {output ? (
          <figure style={{ margin: 0 }}>
            <img
              src={output}
              alt="resized"
              style={{ maxWidth: 320, border: '1px solid #d1d5db' }}
            />
            <figcaption style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
              resizeImage output, {Math.round((output.length * 3) / 4 / 1024)}{' '}
              KB of data URL (EXIF ignored)
            </figcaption>
          </figure>
        ) : null}
      </div>
    </div>
  );
}

const meta = {
  title: 'tinita-dom/Resize image',
  component: Panel,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Panel>;

export default meta;

export const WithYourOwnPhoto: StoryObj<typeof meta> = {};
