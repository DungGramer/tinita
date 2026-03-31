import { describe, it, expect } from 'vitest';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors/download-errors';

describe('DownloadError', () => {
  it('extends Error', () => {
    const err = new DownloadError('msg', DownloadErrorCode.INVALID_INPUT);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('has name = DownloadError', () => {
    const err = new DownloadError('msg', DownloadErrorCode.INVALID_INPUT);
    expect(err.name).toBe('DownloadError');
  });

  it('stores message', () => {
    const err = new DownloadError('something went wrong', DownloadErrorCode.FETCH_FAILED);
    expect(err.message).toBe('something went wrong');
  });

  it('stores code', () => {
    const err = new DownloadError('msg', DownloadErrorCode.FETCH_TIMEOUT);
    expect(err.code).toBe(DownloadErrorCode.FETCH_TIMEOUT);
  });

  it('stores cause when provided', () => {
    const cause = new Error('root cause');
    const err = new DownloadError('msg', DownloadErrorCode.FETCH_FAILED, cause);
    expect(err.cause).toBe(cause);
  });

  it('cause is undefined when not provided', () => {
    const err = new DownloadError('msg', DownloadErrorCode.BROWSER_ONLY);
    expect(err.cause).toBeUndefined();
  });

  it('supports all DownloadErrorCode values', () => {
    const codes = [
      DownloadErrorCode.INVALID_INPUT,
      DownloadErrorCode.BLOB_CREATION_FAILED,
      DownloadErrorCode.BROWSER_ONLY,
      DownloadErrorCode.FETCH_FAILED,
      DownloadErrorCode.FETCH_TIMEOUT,
      DownloadErrorCode.FETCH_ABORTED,
      DownloadErrorCode.TRIGGER_FAILED,
    ];
    for (const code of codes) {
      const err = new DownloadError('msg', code);
      expect(err.code).toBe(code);
    }
  });

  it('instanceof check works correctly after transpilation (prototype chain)', () => {
    const err = new DownloadError('msg', DownloadErrorCode.INVALID_INPUT);
    expect(Object.getPrototypeOf(err)).toBe(DownloadError.prototype);
  });
});
