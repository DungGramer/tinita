// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from '../../src/download/download-blob';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors';

function setupBrowserMocks() {
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => `blob:mock-${Math.random()}`);
  } else {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:mock-${Math.random()}`);
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn();
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  }
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
}

describe('downloadBlob()', () => {
  beforeEach(() => {
    setupBrowserMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns DownloadResult with success: true', () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'hello.txt');
    expect(result.success).toBe(true);
  });

  it('returns correct filename', () => {
    const blob = new Blob(['content'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'my-file.txt');
    expect(result.filename).toBe('my-file.txt');
  });

  it('returns correct size', () => {
    const content = 'hello world';
    const blob = new Blob([content], { type: 'text/plain' });
    const result = downloadBlob(blob, 'file.txt');
    expect(result.size).toBe(blob.size);
  });

  it('returns correct mimeType from blob', () => {
    const blob = new Blob(['data'], { type: 'text/csv' });
    const result = downloadBlob(blob, 'data.csv');
    expect(result.mimeType).toBe('text/csv');
  });

  it('falls back to application/octet-stream when blob has no type', () => {
    const blob = new Blob(['data']);
    const result = downloadBlob(blob, 'data.bin');
    expect(result.mimeType).toBe('application/octet-stream');
  });

  it('returns the blob reference', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'test.txt');
    expect(result.blob).toBe(blob);
  });

  it('result has clicked: true when anchor click fires', () => {
    const blob = new Blob(['content'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'file.txt');
    expect(result.clicked).toBe(true);
  });

  it('result has revoked: false before revokeDelay', () => {
    vi.useFakeTimers();
    const blob = new Blob(['content'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'file.txt');
    expect(result.revoked).toBe(false);
    vi.useRealTimers();
  });

  it('provides a cleanup function', () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'file.bin');
    expect(typeof result.cleanup).toBe('function');
    expect(() => result.cleanup()).not.toThrow();
  });

  it('passes autoRevoke: false through options', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const blob = new Blob(['data']);
    downloadBlob(blob, 'file.bin', { autoRevoke: false });
    vi.advanceTimersByTime(60000);
    expect(revoke).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('passes revokeDelay through options (auto-revokes after delay)', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    const blob = new Blob(['data']);
    downloadBlob(blob, 'file.bin', { revokeDelay: 1000, autoRevoke: true });
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(revoke).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('works with a File input (File extends Blob)', () => {
    const file = new File(['file content'], 'document.pdf', { type: 'application/pdf' });
    const result = downloadBlob(file, 'document.pdf');
    expect(result.success).toBe(true);
    expect(result.filename).toBe('document.pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('has correct DownloadResult shape', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const result = downloadBlob(blob, 'test.txt');
    expect(result).toMatchObject({
      success: true,
      filename: 'test.txt',
      mimeType: 'text/plain',
      clicked: true,
    });
    expect(typeof result.size).toBe('number');
    expect(typeof result.cleanup).toBe('function');
    expect(result.blob).toBeInstanceOf(Blob);
  });
});

describe('downloadBlob() outside browser', () => {
  it('throws BROWSER_ONLY when window is not defined', () => {
    // We simulate the non-browser env by temporarily hiding window
    const originalWindow = globalThis.window;
    // @ts-expect-error intentional
    delete globalThis.window;

    try {
      const blob = new Blob(['data']);
      expect(() => downloadBlob(blob, 'file.txt')).toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
