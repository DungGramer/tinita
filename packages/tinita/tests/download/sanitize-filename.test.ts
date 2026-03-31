import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../../src/download/core/sanitize-filename';

describe('sanitizeFilename()', () => {
  // Path traversal
  it('strips path traversal sequences', () => {
    // ../../etc/passwd → dots stripped, slashes become replacements → "etcpasswd"
    const result = sanitizeFilename('../../etc/passwd');
    expect(result).toBe('etcpasswd');
  });

  it('strips leading path separators', () => {
    const result = sanitizeFilename('/etc/passwd');
    expect(result).toBe('etcpasswd');
  });

  // OS-invalid characters
  it('strips OS-invalid characters (< > : " | ? *)', () => {
    const result = sanitizeFilename('file<>:"|?*.txt');
    expect(result).toBe('file.txt');
  });

  // Control characters
  it('strips control characters (0x00-0x1F)', () => {
    // \x00 and \x1F are stripped
    const result = sanitizeFilename('file\x00\x1Fname.txt');
    expect(result).toBe('filename.txt');
  });

  // Trailing dots (Windows restriction)
  it('strips trailing dots', () => {
    const result = sanitizeFilename('file...');
    expect(result).toBe('file');
  });

  // Trailing spaces
  it('strips trailing spaces', () => {
    const result = sanitizeFilename('file   ');
    expect(result).toBe('file');
  });

  // Truncation with extension preservation
  it('preserves extension on truncate (260-char name + .pdf → 251-char stem + .pdf)', () => {
    const longStem = 'a'.repeat(260);
    const input = longStem + '.pdf';
    const result = sanitizeFilename(input);
    // maxLength=255, ext='.pdf' (4 chars), stem max = 251
    expect(result).toBe('a'.repeat(251) + '.pdf');
    expect(result.length).toBe(255);
  });

  // Fallback for empty result
  it('returns fallback for empty result (all dots stripped)', () => {
    // "..." → trailing dots stripped → empty → fallback
    const result = sanitizeFilename('...');
    expect(result).toBe('download');
  });

  it('returns custom fallback when result is empty', () => {
    const result = sanitizeFilename('...', { fallback: 'unnamed' });
    expect(result).toBe('unnamed');
  });

  // Custom maxLength
  it('respects custom maxLength', () => {
    const result = sanitizeFilename('longname.txt', { maxLength: 8 });
    // ext='.txt' (4 chars), stem max = 4 → 'long.txt'
    expect(result).toBe('long.txt');
    expect(result.length).toBe(8);
  });

  // Custom replacement
  it('replaces invalid chars with custom replacement string', () => {
    const result = sanitizeFilename('a:b', { replacement: '_' });
    expect(result).toBe('a_b');
  });

  // Normal filename passthrough
  it('passes through a normal safe filename unchanged', () => {
    const result = sanitizeFilename('report-2024.csv');
    expect(result).toBe('report-2024.csv');
  });

  // Empty string input
  it('returns fallback for empty string input', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('download');
  });

  // Filename at exactly maxLength — no truncation
  it('does not truncate when length equals maxLength', () => {
    const input = 'a'.repeat(255);
    const result = sanitizeFilename(input);
    expect(result.length).toBe(255);
  });

  // Extension longer than 20 chars — not preserved during truncation
  it('does not preserve very long extension on truncate', () => {
    const longExt = '.' + 'x'.repeat(25); // 26 chars — over 20 char limit
    const input = 'a'.repeat(240) + longExt;
    const result = sanitizeFilename(input);
    // Extension too long to preserve, simple truncation to 255
    expect(result.length).toBe(255);
  });
});
