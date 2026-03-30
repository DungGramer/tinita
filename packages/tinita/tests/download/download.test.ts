// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { download } from '../../src/download/download';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors';

// ─── MockXHR ──────────────────────────────────────────────────────────────────

class MockXHR {
  public responseType = '';
  public timeout = 0;
  public withCredentials = false;
  public status = 200;
  public statusText = 'OK';
  public response: unknown = null;
  public readyState = 0;

  public onloadstart: ((e: ProgressEvent) => void) | null = null;
  public onprogress: ((e: ProgressEvent) => void) | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public ontimeout: (() => void) | null = null;
  public onabort: (() => void) | null = null;

  private _headers: Record<string, string> = {};
  private _responseHeaders: Record<string, string> = {};

  open(_method: string, _url: string) {}
  send() {}
  abort() { this.onabort?.(); }
  setRequestHeader(name: string, value: string) { this._headers[name] = value; }
  getResponseHeader(name: string): string | null { return this._responseHeaders[name] ?? null; }

  _setResponseHeaders(headers: Record<string, string>) {
    this._responseHeaders = { ...headers };
  }

  _simulateSuccess(blob: Blob, headers?: Record<string, string>) {
    if (headers) this._setResponseHeaders(headers);
    this.response = blob;
    this.onload?.();
  }

  _simulateError() {
    this.onerror?.();
  }
}

let currentMockXhr: MockXHR;

function createMockXHRConstructor() {
  return function MockXHRConstructor(this: MockXHR) {
    const instance = new MockXHR();
    currentMockXhr = instance;
    return instance;
  } as unknown as typeof XMLHttpRequest;
}

// ─── Shared browser mocks ─────────────────────────────────────────────────────

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

describe('download()', () => {
  beforeEach(() => {
    setupBrowserMocks();
    vi.stubGlobal('XMLHttpRequest', createMockXHRConstructor());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ── Memory inputs ─────────────────────────────────────────────────────────────

  describe('memory inputs', () => {
    it('downloads a Blob and returns DownloadResult', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      const result = await download(blob, { filename: 'hello.txt' });
      expect(result.success).toBe(true);
      expect(result.filename).toBe('hello.txt');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.clicked).toBe(true);
    });

    it('downloads a string as text', async () => {
      const result = await download('col1,col2\n1,2', { filename: 'data.csv', mimeType: 'text/csv' });
      expect(result.success).toBe(true);
      expect(result.filename).toBe('data.csv');
      expect(result.mimeType).toBe('text/csv');
    });

    it('downloads an ArrayBuffer', async () => {
      const buf = new ArrayBuffer(8);
      const result = await download(buf, { filename: 'data.bin' });
      expect(result.success).toBe(true);
      expect(result.size).toBe(8);
    });

    it('downloads a Uint8Array', async () => {
      const arr = new Uint8Array([1, 2, 3, 4]);
      const result = await download(arr, { filename: 'bytes.bin' });
      expect(result.success).toBe(true);
      expect(result.size).toBe(4);
    });

    it('downloads a File', async () => {
      const file = new File(['file content'], 'upload.txt', { type: 'text/plain' });
      const result = await download(file);
      expect(result.success).toBe(true);
      expect(result.filename).toBe('upload.txt');
    });
  });

  // ── DownloadResult shape ──────────────────────────────────────────────────────

  describe('DownloadResult shape', () => {
    it('returns correct shape with all fields', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const result = await download(blob, { filename: 'test.txt' });
      expect(result).toMatchObject({
        success: true,
        filename: 'test.txt',
        mimeType: 'text/plain',
        clicked: true,
        revoked: false,
      });
      expect(result.blob).toBeInstanceOf(Blob);
      expect(typeof result.size).toBe('number');
      expect(typeof result.cleanup).toBe('function');
    });
  });

  // ── URL delegation ────────────────────────────────────────────────────────────

  describe('URL delegation', () => {
    it('delegates URL string to downloadFromUrl, returns Promise<DownloadResult> (not DownloadTask)', async () => {
      const resultPromise = download('https://example.com/doc.pdf', { filename: 'doc.pdf' });

      // result must be a Promise (not a DownloadTask with .abort/.xhr)
      expect(resultPromise).toBeInstanceOf(Promise);
      expect(resultPromise).not.toHaveProperty('abort');
      expect(resultPromise).not.toHaveProperty('xhr');

      // simulate XHR success
      const blob = new Blob(['pdf content'], { type: 'application/pdf' });
      currentMockXhr._simulateSuccess(blob);

      const result = await resultPromise;
      expect(result.success).toBe(true);
      expect(result.filename).toBe('doc.pdf');
    });

    it('delegates URL object to downloadFromUrl', async () => {
      const resultPromise = download(new URL('https://example.com/file.txt'), { filename: 'file.txt' });

      const blob = new Blob(['content'], { type: 'text/plain' });
      currentMockXhr._simulateSuccess(blob);

      const result = await resultPromise;
      expect(result.success).toBe(true);
    });

    it('URL download resolves with DownloadResult, not DownloadTask', async () => {
      const resultPromise = download('https://example.com/report.pdf', { filename: 'report.pdf' });

      const blob = new Blob(['report'], { type: 'application/pdf' });
      currentMockXhr._simulateSuccess(blob);

      const result = await resultPromise;
      // Check it's a DownloadResult, not a DownloadTask
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('blob');
      expect(result).not.toHaveProperty('abort');
      expect(result).not.toHaveProperty('xhr');
    });
  });

  // ── Lifecycle hooks ───────────────────────────────────────────────────────────

  describe('lifecycle hooks', () => {
    it('calls onBeforeDownload with PreparedDownload', async () => {
      const onBefore = vi.fn();
      const blob = new Blob(['data'], { type: 'text/plain' });
      await download(blob, { filename: 'file.txt', onBeforeDownload: onBefore });
      expect(onBefore).toHaveBeenCalledOnce();
      const arg = onBefore.mock.calls[0]![0];
      expect(arg).toMatchObject({
        filename: 'file.txt',
        size: expect.any(Number),
      });
      expect(typeof arg.trigger).toBe('function');
      expect(typeof arg.cleanup).toBe('function');
    });

    it('calls onAfterDownload with DownloadResult', async () => {
      const onAfter = vi.fn();
      const blob = new Blob(['data']);
      await download(blob, { filename: 'file.txt', onAfterDownload: onAfter });
      expect(onAfter).toHaveBeenCalledOnce();
      const arg = onAfter.mock.calls[0]![0];
      expect(arg.success).toBe(true);
    });

    it('onBeforeDownload returning false aborts download', async () => {
      const blob = new Blob(['data']);
      const result = await download(blob, {
        filename: 'file.txt',
        onBeforeDownload: () => false,
      });
      expect(result.success).toBe(false);
      expect(result.clicked).toBe(false);
      expect(result.revoked).toBe(true);
    });

    it('onBeforeDownload returning undefined does NOT abort', async () => {
      const blob = new Blob(['data']);
      const result = await download(blob, {
        filename: 'file.txt',
        onBeforeDownload: () => undefined,
      });
      expect(result.success).toBe(true);
    });

    it('onBeforeDownload returning true does NOT abort', async () => {
      const blob = new Blob(['data']);
      const result = await download(blob, {
        filename: 'file.txt',
        onBeforeDownload: () => true as unknown as void,
      });
      expect(result.success).toBe(true);
    });

    it('onAfterDownload not called when onBeforeDownload returns false', async () => {
      const onAfter = vi.fn();
      const blob = new Blob(['data']);
      await download(blob, {
        filename: 'file.txt',
        onBeforeDownload: () => false,
        onAfterDownload: onAfter,
      });
      expect(onAfter).not.toHaveBeenCalled();
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('onError fires on URL failure, error is NOT re-thrown', async () => {
      const onError = vi.fn();
      const resultPromise = download('https://example.com/file', { onError });

      // Simulate network error
      currentMockXhr._simulateError();

      const result = await resultPromise;
      // onError fires from XHR-level (downloadFromUrl) and from download() wrapper catch block
      expect(onError).toHaveBeenCalled();
      const err = onError.mock.calls[0]![0];
      expect(err).toBeInstanceOf(DownloadError);
      expect(result.success).toBe(false);
    });

    it('throws DownloadError for URL when onError is not provided', async () => {
      const resultPromise = download('https://example.com/file');
      currentMockXhr._simulateError();

      await expect(resultPromise).rejects.toBeInstanceOf(DownloadError);
    });

    it('error result has correct shape', async () => {
      const onError = vi.fn();
      const resultPromise = download('https://example.com/file', {
        filename: 'file.txt',
        onError,
      });

      currentMockXhr._simulateError();

      const result = await resultPromise;
      expect(result).toMatchObject({
        success: false,
        clicked: false,
        revoked: true,
        size: 0,
      });
    });
  });
});
