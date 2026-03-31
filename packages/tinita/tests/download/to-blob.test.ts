import { describe, it, expect } from 'vitest';
import { toBlob } from '../../src/download/core/to-blob';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors/download-errors';

describe('toBlob', () => {
  describe('Blob input', () => {
    it('returns the same Blob when no mimeType override', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await toBlob(blob);
      expect(result).toBe(blob);
    });

    it('re-wraps with new mimeType when override differs', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await toBlob(blob, { mimeType: 'application/octet-stream' });
      expect(result).not.toBe(blob);
      expect(result.type).toBe('application/octet-stream');
      expect(result.size).toBe(blob.size);
    });

    it('returns same Blob when mimeType matches', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await toBlob(blob, { mimeType: 'text/plain' });
      expect(result).toBe(blob);
    });
  });

  describe('File input', () => {
    it('returns File as-is when no mimeType override', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await toBlob(file);
      expect(result).toBe(file);
    });

    it('re-wraps File with new mimeType', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await toBlob(file, { mimeType: 'text/csv' });
      expect(result.type).toBe('text/csv');
    });
  });

  describe('ArrayBuffer input', () => {
    it('converts ArrayBuffer to Blob with correct size', async () => {
      const buf = new ArrayBuffer(16);
      const result = await toBlob(buf);
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBe(16);
    });

    it('applies mimeType to ArrayBuffer blob', async () => {
      const buf = new ArrayBuffer(8);
      const result = await toBlob(buf, { mimeType: 'application/pdf' });
      expect(result.type).toBe('application/pdf');
    });

    it('uses DEFAULT_MIME_TYPE for ArrayBuffer when no mimeType', async () => {
      const buf = new ArrayBuffer(4);
      const result = await toBlob(buf);
      expect(result.type).toBe('application/octet-stream');
    });
  });

  describe('Uint8Array input', () => {
    it('converts Uint8Array to Blob with correct size', async () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await toBlob(arr);
      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBe(5);
    });

    it('applies mimeType to Uint8Array blob', async () => {
      const arr = new Uint8Array([1, 2, 3]);
      const result = await toBlob(arr, { mimeType: 'image/png' });
      expect(result.type).toBe('image/png');
    });
  });

  describe('string text input', () => {
    it('converts plain string to Blob', async () => {
      const result = await toBlob('Hello, world!');
      expect(result).toBeInstanceOf(Blob);
      const text = await result.text();
      expect(text).toBe('Hello, world!');
    });

    it('uses text/plain;charset=utf-8 as default mime for text', async () => {
      const result = await toBlob('text content');
      expect(result.type).toBe('text/plain;charset=utf-8');
    });

    it('uses provided mimeType for text input', async () => {
      const result = await toBlob('col1,col2\n1,2', { mimeType: 'text/csv' });
      expect(result.type).toBe('text/csv');
    });

    it('prepends UTF-8 BOM when addBom=true (blob is larger than without BOM)', async () => {
      const withBom = await toBlob('hello', { addBom: true });
      const withoutBom = await toBlob('hello', { addBom: false });
      // BOM is 3 bytes in UTF-8 (\xEF\xBB\xBF), so the blob with BOM should be larger
      expect(withBom.size).toBeGreaterThan(withoutBom.size);

      // Verify the BOM bytes are present in the raw ArrayBuffer
      const buf = await withBom.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // UTF-8 BOM: 0xEF 0xBB 0xBF
      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
    });

    it('does NOT prepend BOM when addBom=false (default)', async () => {
      const result = await toBlob('hello', { addBom: false });
      const text = await result.text();
      expect(text.charCodeAt(0)).not.toBe(0xfeff);
      expect(text).toBe('hello');
    });
  });

  describe('data-url input', () => {
    it('decodes base64 data URL to Blob', async () => {
      // data:text/plain;base64,SGVsbG8= => "Hello"
      const result = await toBlob('data:text/plain;base64,SGVsbG8=');
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('text/plain');
      const text = await result.text();
      expect(text).toBe('Hello');
    });

    it('preserves MIME type from data URL', async () => {
      const result = await toBlob('data:image/png;base64,iVBORw0KGgo=');
      expect(result.type).toBe('image/png');
    });

    it('allows mimeType override for data URL', async () => {
      const result = await toBlob('data:text/plain;base64,SGVsbG8=', { mimeType: 'text/csv' });
      expect(result.type).toBe('text/csv');
    });

    it('decodes plain text data URL (not base64)', async () => {
      const result = await toBlob('data:text/plain,Hello%20World');
      const text = await result.text();
      expect(text).toBe('Hello World');
    });
  });

  describe('Response input', () => {
    it('extracts blob from Response body', async () => {
      const response = new Response('response body', {
        headers: { 'Content-Type': 'text/plain' },
      });
      const result = await toBlob(response);
      expect(result).toBeInstanceOf(Blob);
      const text = await result.text();
      expect(text).toBe('response body');
    });

    it('applies mimeType override to response blob', async () => {
      const response = new Response('data', {
        headers: { 'Content-Type': 'text/plain' },
      });
      const result = await toBlob(response, { mimeType: 'application/json' });
      expect(result.type).toBe('application/json');
    });
  });

  describe('URL input throws', () => {
    it('throws INVALID_INPUT for url-string', async () => {
      await expect(toBlob('https://example.com/file.pdf')).rejects.toThrow(DownloadError);
      await expect(toBlob('https://example.com/file.pdf')).rejects.toMatchObject({
        code: DownloadErrorCode.INVALID_INPUT,
      });
    });

    it('throws INVALID_INPUT for URL object', async () => {
      await expect(toBlob(new URL('https://example.com'))).rejects.toThrow(DownloadError);
      await expect(toBlob(new URL('https://example.com'))).rejects.toMatchObject({
        code: DownloadErrorCode.INVALID_INPUT,
      });
    });

    it('throws INVALID_INPUT when inputType="url" is passed explicitly', async () => {
      await expect(toBlob('https://example.com', { inputType: 'url' })).rejects.toThrow(DownloadError);
    });
  });
});
