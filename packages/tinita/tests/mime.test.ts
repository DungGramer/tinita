import { describe, expect, it } from 'vitest';
import { DEFAULT_TYPE_TO_EXTENSION } from '../src/mime/defaultTypes';
import { createMime, mime } from '../src/mime/mime';
import { full } from '../src/mime/plugin/full';

describe('mime.fromExtension / toExtension', () => {
  it('resolves the formats a web app actually handles', () => {
    expect(mime.fromExtension('png')).toBe('image/png');
    expect(mime.fromExtension('webp')).toBe('image/webp');
    expect(mime.fromExtension('avif')).toBe('image/avif');
    expect(mime.fromExtension('woff2')).toBe('font/woff2');
    expect(mime.fromExtension('wasm')).toBe('application/wasm');
    expect(mime.fromExtension('webm')).toBe('video/webm');
  });

  it('knows the formats the Tomcat-era table was MISSING', () => {
    // The table this replaced was a copy of Tomcat conf/web.xml, vintage ~2003.
    for (const extension of ['webp', 'avif', 'woff2', 'wasm', 'webm']) {
      expect(mime.fromExtension(extension)).toBeDefined();
    }
  });

  it('does NOT know image/x-jg, the dead AOL format the old table carried', () => {
    expect(mime.fromExtension('art')).not.toBe('image/x-jg');
  });

  it('accepts a leading dot and any case', () => {
    expect(mime.fromExtension('.PNG')).toBe('image/png');
    expect(mime.fromExtension('PNG')).toBe('image/png');
  });

  it('returns undefined rather than guessing', () => {
    // The version this replaced fell back to mimeType.split('/').pop(), so
    // toExtension('application/vnd.ms-excel') returned 'vnd.ms-excel'.
    expect(mime.fromExtension('nosuchext')).toBeUndefined();
    expect(mime.toExtension('application/x-not-real')).toBeUndefined();
    expect(mime.toExtension('application/vnd.ms-excel')).toBe('xls');
  });

  it('strips media type parameters', () => {
    expect(mime.toExtension('text/plain;charset=utf-8')).toBe('txt');
    expect(mime.toExtension('TEXT/PLAIN')).toBe('txt');
  });

  it('is NOT a strict inverse, and the JSDoc says so', () => {
    // image/jpeg owns jpg, jpeg and jpe; only the preferred one comes back.
    expect(mime.fromExtension('jpeg')).toBe('image/jpeg');
    expect(mime.fromExtension('jpg')).toBe('image/jpeg');
    expect(mime.toExtension('image/jpeg')).toBe('jpg');
  });

  it('round-trips in the direction that IS guaranteed', () => {
    // For every type in the table, its preferred extension resolves back to it.
    const types = [
      'image/png',
      'image/jpeg',
      'application/pdf',
      'font/woff2',
      'video/webm',
      'text/csv',
      'application/zip',
    ];
    for (const type of types) {
      const extension = mime.toExtension(type);
      expect(extension, type).toBeDefined();
      expect(mime.fromExtension(extension as string), type).toBe(type);
    }
  });

  it('throws on a non-string', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => mime.fromExtension(null)).toThrow(TypeError);
    // @ts-expect-error deliberately wrong type
    expect(() => mime.toExtension(42)).toThrow(TypeError);
  });
});

describe('mime.fromFileName', () => {
  it('reads the extension off a file name', () => {
    expect(mime.fromFileName('photo.PNG')).toBe('image/png');
    expect(mime.fromFileName('archive.tar.gz')).toBe('application/gzip');
  });

  it('is undefined for a name with no extension, dotfiles included', () => {
    expect(mime.fromFileName('README')).toBeUndefined();
    expect(mime.fromFileName('.gitignore')).toBeUndefined();
    expect(mime.fromFileName('')).toBeUndefined();
  });
});

describe('mime.acceptToRegExp', () => {
  it('matches on a literal dot, so notapng is REJECTED', () => {
    // Measured 2026-10-01: the version this replaced produced /(png|jpeg)$/i, which
    // accepted 'notapng' and 'bigpng'. A file filter that passes what it exists to
    // block.
    const pattern = mime.acceptToRegExp('image/png, .jpeg');
    expect(pattern.test('a.png')).toBe(true);
    expect(pattern.test('a.jpeg')).toBe(true);
    expect(pattern.test('notapng')).toBe(false);
    expect(pattern.test('bigpng')).toBe(false);
  });

  it('handles image/*, which the old version THREW on', () => {
    // Measured: SyntaxError: Invalid regular expression: /(*)$/i: Nothing to repeat.
    // `accept="image/*"` is the most common value there is.
    const pattern = mime.acceptToRegExp('image/*');
    expect(pattern.test('a.png')).toBe(true);
    expect(pattern.test('a.webp')).toBe(true);
    expect(pattern.test('a.pdf')).toBe(false);
  });

  it('splits on a comma WITHOUT requiring a space', () => {
    // The old version split on ', ' exactly, so the plain HTML form produced
    // /(image\/png,jpeg)$/i.
    const pattern = mime.acceptToRegExp('image/png,.pdf');
    expect(pattern.test('a.png')).toBe(true);
    expect(pattern.test('a.pdf')).toBe(true);
  });

  it('matches EVERY extension of a named type, not just the preferred one', () => {
    const pattern = mime.acceptToRegExp('image/jpeg');
    expect(pattern.test('a.jpg')).toBe(true);
    expect(pattern.test('a.jpeg')).toBe(true);
  });

  it('matches NOTHING for empty or unrecognised input', () => {
    // The old version returned new RegExp(''), which matched every name, .exe too.
    for (const accept of [
      '',
      '   ',
      ',,',
      'nonsense',
      'application/x-not-real',
    ]) {
      const pattern = mime.acceptToRegExp(accept);
      expect(pattern.test('anything.exe'), accept).toBe(false);
      expect(pattern.test('a.png'), accept).toBe(false);
    }
  });

  it('is case-insensitive on the file name', () => {
    expect(mime.acceptToRegExp('.pdf').test('REPORT.PDF')).toBe(true);
  });

  it('throws on a non-string', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => mime.acceptToRegExp(null)).toThrow(TypeError);
  });
});

describe('mime.extend', () => {
  it('adds the long tail without moving the defaults', () => {
    const instance = createMime();
    expect(instance.fromExtension('dcurl')).toBeUndefined();

    instance.extend(full);

    expect(instance.fromExtension('dcurl')).toBe('text/vnd.curl.dcurl');
    // First registration wins, so a default is never overwritten by a plugin.
    expect(instance.fromExtension('png')).toBe('image/png');
    expect(instance.toExtension('image/jpeg')).toBe('jpg');
  });

  it('applying the same plugin twice is a no-op, and extend chains', () => {
    const instance = createMime();
    expect(instance.extend(full).extend(full)).toBe(instance);
    expect(instance.fromExtension('dcurl')).toBe('text/vnd.curl.dcurl');
  });

  it('instances are isolated - one extend does not leak into another', () => {
    const extended = createMime().extend(full);
    const plain = createMime();
    expect(extended.fromExtension('dcurl')).toBeDefined();
    expect(plain.fromExtension('dcurl')).toBeUndefined();
  });

  it('image/* sees more formats after extend', () => {
    const plain = createMime();
    const extended = createMime().extend(full);
    const sample = 'a.jp2';
    expect(plain.acceptToRegExp('image/*').test(sample)).toBe(false);
    expect(extended.acceptToRegExp('image/*').test(sample)).toBe(true);
  });

  it('throws on a non-function', () => {
    // @ts-expect-error deliberately wrong type
    expect(() => createMime().extend({})).toThrow(TypeError);
  });
});

describe('the generated tables', () => {
  it('the default table stays small - that is the whole reason it is split', () => {
    // Measured 2026-10-01: full is 1015 types / 81.6KB of source, and bundle:true
    // inlines whatever is imported into every entry. QD-F split it for this reason.
    const defaultTypes = Object.keys(DEFAULT_TYPE_TO_EXTENSION);
    expect(defaultTypes.length).toBeLessThan(120);
    expect(defaultTypes.length).toBeGreaterThan(40);
  });
});
