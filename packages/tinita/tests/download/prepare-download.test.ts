// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prepareDownload } from '../../src/download/api/prepare-download';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors/download-errors';

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

describe('prepareDownload', () => {
  beforeEach(() => {
    setupBrowserMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns PreparedDownload with blob property', async () => {
    const blob = new Blob(['content'], { type: 'text/plain' });
    const prepared = await prepareDownload(blob, { filename: 'file.txt' });
    expect(prepared.blob).toBeInstanceOf(Blob);
  });

  it('returns PreparedDownload with resolved filename', async () => {
    const blob = new Blob(['content']);
    const prepared = await prepareDownload(blob, { filename: 'report.csv' });
    expect(prepared.filename).toBe('report.csv');
  });

  it('returns PreparedDownload with objectUrl string', async () => {
    const blob = new Blob(['content']);
    const prepared = await prepareDownload(blob, { filename: 'file.txt' });
    expect(typeof prepared.objectUrl).toBe('string');
    expect(prepared.objectUrl.length).toBeGreaterThan(0);
  });

  it('returns PreparedDownload with mimeType', async () => {
    const blob = new Blob(['content'], { type: 'text/csv' });
    const prepared = await prepareDownload(blob);
    expect(prepared.mimeType).toBe('text/csv');
  });

  it('returns PreparedDownload with correct size', async () => {
    const blob = new Blob(['hello']);
    const prepared = await prepareDownload(blob);
    expect(prepared.size).toBe(5);
  });

  it('has trigger() and cleanup() functions', async () => {
    const blob = new Blob(['data']);
    const prepared = await prepareDownload(blob);
    expect(typeof prepared.trigger).toBe('function');
    expect(typeof prepared.cleanup).toBe('function');
  });

  it('trigger() returns DownloadResult with success=true', async () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    const prepared = await prepareDownload(blob, { filename: 'test.txt' });
    const result = prepared.trigger();
    expect(result.success).toBe(true);
    expect(result.filename).toBe('test.txt');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThanOrEqual(0);
    expect(typeof result.cleanup).toBe('function');
  });

  it('cleanup() revokes objectUrl without triggering download', async () => {
    const blob = new Blob(['data']);
    const prepared = await prepareDownload(blob);
    prepared.cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('uses File.name as filename when no option provided', async () => {
    const file = new File(['data'], 'document.pdf', { type: 'application/pdf' });
    const prepared = await prepareDownload(file);
    expect(prepared.filename).toBe('document.pdf');
  });

  it('throws INVALID_INPUT for URL string input', async () => {
    await expect(prepareDownload('https://example.com/file')).rejects.toMatchObject({
      code: DownloadErrorCode.INVALID_INPUT,
    });
  });

  it('converts string text to Blob', async () => {
    const prepared = await prepareDownload('hello, csv', { filename: 'data.csv', mimeType: 'text/csv' });
    expect(prepared.mimeType).toBe('text/csv');
    expect(prepared.size).toBeGreaterThan(0);
  });

  it('prepends BOM when addBom=true', async () => {
    const prepared = await prepareDownload('hello', { addBom: true });
    const text = await prepared.blob.text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
  });
});
