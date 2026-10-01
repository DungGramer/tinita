import { describe, expect, it } from 'vitest';
import { base64ToBlob } from '../src/converter/base64ToBlob';
import { base64ToBytes } from '../src/converter/base64ToBytes';
import { base64ToString } from '../src/converter/base64ToString';
import { blobToBase64 } from '../src/converter/blobToBase64';
import { blobToDataUrl } from '../src/converter/blobToDataUrl';
import { blobToUint8Array } from '../src/converter/blobToUint8Array';
import { bytesToBase64 } from '../src/converter/bytesToBase64';
import { dataUrlToBlob } from '../src/converter/dataUrlToBlob';
import { stringToBase64 } from '../src/converter/stringToBase64';

describe('bytesToBase64 / base64ToBytes', () => {
  it('encodes and decodes a known vector', () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    expect([...base64ToBytes('aGk=')]).toEqual([104, 105]);
  });

  it('handles empty input both ways', () => {
    expect(bytesToBase64(new Uint8Array())).toBe('');
    expect(base64ToBytes('')).toHaveLength(0);
  });

  it('accepts base64 with and without padding', () => {
    expect([...base64ToBytes('aGk')]).toEqual([104, 105]);
    expect([...base64ToBytes('aGk=')]).toEqual([104, 105]);
  });

  it('covers every byte value 0..255', () => {
    const all = new Uint8Array(256).map((_, i) => i);
    expect([...base64ToBytes(bytesToBase64(all))]).toEqual([...all]);
  });

  it('survives a payload larger than one chunk', () => {
    // 0x8000 is the chunk size. `String.fromCharCode(...bytes)` on the whole array
    // would overflow the stack here; chunking is what makes this pass.
    const big = new Uint8Array(0x8000 * 3 + 7).map((_, i) => i % 256);
    expect([...base64ToBytes(bytesToBase64(big))]).toEqual([...big]);
  });

  it('REJECTS base64url instead of quietly accepting it', () => {
    // Accepting both alphabets would stop this being the exact inverse of
    // bytesToBase64, which only ever emits one of them.
    expect(() => base64ToBytes('-_8=')).toThrow(TypeError);
    expect(() => base64ToBytes('-_8=')).toThrow(/base64url/);
  });

  it('throws TypeError, not DOMException, on malformed base64', () => {
    // `atob` throws DOMException, which Node cannot catch by type and which names
    // neither this function nor what the caller did wrong.
    expect(() => base64ToBytes('!!!!')).toThrow(TypeError);
    expect(() => base64ToBytes('a')).toThrow(TypeError);
  });

  it('throws on the wrong input type', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => bytesToBase64('aGk=')).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => base64ToBytes(42)).toThrow(TypeError);
  });
});

describe('stringToBase64 / base64ToString', () => {
  it('round-trips ASCII, Vietnamese and astral characters', () => {
    for (const sample of [
      '',
      'hi',
      'Hòm nhĩ trái',
      '\u{1F600}\u{1F1FB}\u{1F1F3}',
      '日本語',
    ]) {
      expect(base64ToString(stringToBase64(sample))).toBe(sample);
    }
  });

  it('encodes beyond U+00FF, which bare btoa cannot', () => {
    // `ĩ` is U+0129. `ò` would not do: U+00F2 is inside Latin-1 and btoa takes it.
    expect(() => btoa('ĩ')).toThrow();
    expect(base64ToString(stringToBase64('ĩ'))).toBe('ĩ');
  });

  it('a lone surrogate becomes U+FFFD, and that is documented, not hidden', () => {
    // TextEncoder's rule, not a choice made here. The JSDoc says so; this test
    // stops anyone from "fixing" it into silence later.
    expect(base64ToString(stringToBase64('\uD800'))).toBe('�');
  });

  it('throws on a non-string rather than coercing', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => stringToBase64(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => base64ToString(undefined)).toThrow(TypeError);
  });

  it('base64ToString(stringToBase64(s)) === s over 2000 random strings', () => {
    const ALPHABET = [
      ...'abcXYZ019 &<>"\'',
      'à',
      'Á',
      'ĩ',
      'đ',
      '日',
      '\u{1F600}',
      'ÿ',
    ];

    // xorshift, seeded: a failure reproduces instead of vanishing on re-run.
    let seed = 0x5d1f3c7;
    const next = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x100000000;
    };

    for (let i = 0; i < 2000; i += 1) {
      let sample = '';
      const length = Math.floor(next() * 32);
      for (let j = 0; j < length; j += 1) {
        sample += ALPHABET[Math.floor(next() * ALPHABET.length)];
      }
      expect(base64ToString(stringToBase64(sample))).toBe(sample);
    }
  });
});

describe('blob converters', () => {
  it('blobToUint8Array reads the bytes', async () => {
    expect([...(await blobToUint8Array(new Blob(['hi'])))]).toEqual([104, 105]);
  });

  it('blobToBase64 returns the payload, not a data URL', async () => {
    // The version this replaced was named for base64 and called readAsDataURL.
    const encoded = await blobToBase64(new Blob(['hi']));
    expect(encoded).toBe('aGk=');
    expect(encoded).not.toContain('data:');
  });

  it('blobToDataUrl returns the prefixed form and keeps the media type', async () => {
    expect(await blobToDataUrl(new Blob(['hi'], { type: 'text/plain' }))).toBe(
      'data:text/plain;base64,aGk='
    );
  });

  it('a blob with no type produces `data:;base64,`, not a guessed type', async () => {
    expect(await blobToDataUrl(new Blob(['hi']))).toBe('data:;base64,aGk=');
  });

  it('blob round-trip preserves bytes and type', async () => {
    const original = new Blob(['xin chào 🇻🇳'], { type: 'text/plain' });
    const restored = base64ToBlob(await blobToBase64(original), original.type);

    expect(await restored.text()).toBe('xin chào 🇻🇳');
    expect(restored.type).toBe('text/plain');
    expect(restored.size).toBe(original.size);
  });

  it('data URL round-trip preserves a media type carrying parameters', async () => {
    const original = new Blob(['ĐÈN'], { type: 'text/plain;charset=utf-8' });
    const restored = dataUrlToBlob(await blobToDataUrl(original));

    expect(await restored.text()).toBe('ĐÈN');
    expect(restored.type).toBe('text/plain;charset=utf-8');
  });

  it('dataUrlToBlob REJECTS the percent-encoded form', async () => {
    // `data:text/plain,hi` is a different encoding. Reading it as base64 would
    // produce a blob full of wrong bytes rather than an error.
    expect(() => dataUrlToBlob('data:text/plain,hi')).toThrow(TypeError);
    expect(() => dataUrlToBlob('not a data url')).toThrow(TypeError);
  });

  it('base64ToBlob throws instead of returning null', async () => {
    // The version this replaced returned null, which put a check on every call
    // site and made a typo look like an empty file.
    expect(() => base64ToBlob('!!!!')).toThrow(TypeError);
  });

  it('an empty blob round-trips', async () => {
    const restored = base64ToBlob(await blobToBase64(new Blob([])));
    expect(restored.size).toBe(0);
  });
});
