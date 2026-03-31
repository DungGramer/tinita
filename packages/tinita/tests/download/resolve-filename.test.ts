import { describe, it, expect } from 'vitest';
import { resolveFilename } from '../../src/download/core/resolve-filename';
import { DEFAULT_FILENAME } from '../../src/download/core/constants';

describe('resolveFilename', () => {
  describe('priority 1: explicit filename option', () => {
    it('returns explicit filename when provided', () => {
      expect(resolveFilename(new Blob(['x']), { filename: 'custom.txt' })).toBe('custom.txt');
    });

    it('explicit filename overrides File.name', () => {
      const file = new File(['x'], 'original.txt');
      expect(resolveFilename(file, { filename: 'override.txt' })).toBe('override.txt');
    });

    it('explicit filename overrides URL input', () => {
      expect(resolveFilename('https://example.com/file.pdf', { filename: 'my.pdf' })).toBe('my.pdf');
    });
  });

  describe('priority 2: File.name', () => {
    it('uses File.name when no explicit filename', () => {
      const file = new File(['content'], 'photo.jpg');
      expect(resolveFilename(file)).toBe('photo.jpg');
    });

    it('uses File.name over Content-Disposition', () => {
      const file = new File(['content'], 'file.txt');
      const response = new Response('', {
        headers: { 'Content-Disposition': 'attachment; filename="from-header.txt"' },
      });
      expect(resolveFilename(file, { response })).toBe('file.txt');
    });
  });

  describe('priority 3: Content-Disposition header', () => {
    it('parses filename from Content-Disposition', () => {
      const response = new Response('', {
        headers: { 'Content-Disposition': 'attachment; filename="report.pdf"' },
      });
      expect(resolveFilename(new Blob(['x']), { response })).toBe('report.pdf');
    });

    it('parses RFC 5987 filename* from Content-Disposition', () => {
      const response = new Response('', {
        headers: { 'Content-Disposition': "attachment; filename*=UTF-8''my%20file.csv" },
      });
      expect(resolveFilename(new Blob(['x']), { response })).toBe('my file.csv');
    });

    it('Content-Disposition overrides URL pathname when blob input', () => {
      const response = new Response('', {
        headers: { 'Content-Disposition': 'attachment; filename="header-name.zip"' },
      });
      expect(resolveFilename(new Blob(['x']), { response })).toBe('header-name.zip');
    });
  });

  describe('priority 4: URL pathname extraction', () => {
    it('extracts filename from https URL string', () => {
      expect(resolveFilename('https://cdn.example.com/assets/image.png')).toBe('image.png');
    });

    it('extracts filename from URL object', () => {
      expect(resolveFilename(new URL('https://example.com/files/doc.pdf'))).toBe('doc.pdf');
    });

    it('extracts filename from URL with query string (stripped)', () => {
      expect(resolveFilename('https://example.com/file.csv?token=abc&v=2')).toBe('file.csv');
    });

    it('extracts filename from URL with hash (stripped)', () => {
      expect(resolveFilename('https://example.com/file.pdf#page=2')).toBe('file.pdf');
    });
  });

  describe('priority 5: DEFAULT_FILENAME fallback', () => {
    it('falls back to DEFAULT_FILENAME for plain text string', () => {
      expect(resolveFilename('Hello, world!')).toBe(DEFAULT_FILENAME);
    });

    it('falls back to DEFAULT_FILENAME for plain Blob', () => {
      expect(resolveFilename(new Blob(['data']))).toBe(DEFAULT_FILENAME);
    });

    it('falls back to DEFAULT_FILENAME for ArrayBuffer', () => {
      expect(resolveFilename(new ArrayBuffer(4))).toBe(DEFAULT_FILENAME);
    });
  });

  describe('sanitization', () => {
    it('strips forward slashes from explicit filename', () => {
      expect(resolveFilename(new Blob(), { filename: 'path/to/file.txt' })).toBe('pathtofile.txt');
    });

    it('strips backslashes from explicit filename', () => {
      expect(resolveFilename(new Blob(), { filename: 'path\\file.txt' })).toBe('pathfile.txt');
    });

    it('trims whitespace from explicit filename', () => {
      expect(resolveFilename(new Blob(), { filename: '  file.txt  ' })).toBe('file.txt');
    });

    it('caps filename at 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = resolveFilename(new Blob(), { filename: longName });
      expect(result.length).toBe(255);
    });
  });
});
