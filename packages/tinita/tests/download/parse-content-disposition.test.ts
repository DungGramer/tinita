import { describe, it, expect } from 'vitest';
import { parseContentDisposition } from '../../src/download/core/parse-content-disposition';

describe('parseContentDisposition', () => {
  describe('quoted filename', () => {
    it('parses attachment; filename="report.pdf"', () => {
      expect(parseContentDisposition('attachment; filename="report.pdf"')).toBe('report.pdf');
    });

    it('parses inline; filename="file with spaces.csv"', () => {
      expect(parseContentDisposition('inline; filename="file with spaces.csv"')).toBe('file with spaces.csv');
    });

    it('unescapes backslash-escaped chars inside quoted string', () => {
      // After unescaping, quotes are stripped by sanitizeFilename (OS-invalid char)
      expect(parseContentDisposition('attachment; filename="say \\"hello\\".txt"')).toBe('say hello.txt');
    });
  });

  describe('unquoted filename', () => {
    it('parses attachment; filename=report.pdf', () => {
      expect(parseContentDisposition('attachment; filename=report.pdf')).toBe('report.pdf');
    });

    it('parses filename=plain.txt without attachment prefix', () => {
      expect(parseContentDisposition('filename=plain.txt')).toBe('plain.txt');
    });
  });

  describe('RFC 5987 extended value (filename*)', () => {
    it('decodes UTF-8 percent-encoded filename', () => {
      expect(parseContentDisposition("attachment; filename*=UTF-8''encoded%20name.pdf")).toBe('encoded name.pdf');
    });

    it('handles lowercase utf-8 charset', () => {
      expect(parseContentDisposition("attachment; filename*=utf-8''my%20file.txt")).toBe('my file.txt');
    });

    it('filename* takes priority over filename', () => {
      const header = "attachment; filename=\"fallback.txt\"; filename*=UTF-8''priority.txt";
      expect(parseContentDisposition(header)).toBe('priority.txt');
    });

    it('filename* takes priority even when it appears after filename', () => {
      const header = "attachment; filename*=UTF-8''star-wins.pdf; filename=\"regular.pdf\"";
      expect(parseContentDisposition(header)).toBe('star-wins.pdf');
    });
  });

  describe('null cases', () => {
    it('returns null for empty string', () => {
      expect(parseContentDisposition('')).toBeNull();
    });

    it('returns null for attachment only (no filename)', () => {
      expect(parseContentDisposition('attachment')).toBeNull();
    });

    it('returns null for inline only', () => {
      expect(parseContentDisposition('inline')).toBeNull();
    });
  });

  describe('sanitization', () => {
    it('strips forward slashes from filename', () => {
      const result = parseContentDisposition('attachment; filename="path/to/file.txt"');
      expect(result).toBe('pathtofile.txt');
    });

    it('strips backslashes from filename', () => {
      const result = parseContentDisposition('attachment; filename="path\\to\\file.txt"');
      // backslash in quoted strings is an escape char — the sanitizeFilename strips path separators
      // The parser unescapes \\t as t, so the value becomes "pathtotofile.txt" after unescaping
      // but the resulting string should not contain backslashes
      expect(result).not.toContain('\\');
    });

    it('trims whitespace', () => {
      const result = parseContentDisposition('attachment; filename="  trimmed.txt  "');
      expect(result).toBe('trimmed.txt');
    });
  });
});
