import { describe, it, expect } from 'vitest';
import {
  DownloadError,
  DownloadErrorCode,
  HttpStatusError,
  NetworkError,
  TimeoutError,
  AbortDownloadError,
  InvalidBlobResponseError,
} from '../../src/download/errors/download-errors';

describe('HttpStatusError', () => {
  const err = new HttpStatusError(404, 'Not Found');

  it('is instanceof DownloadError', () => {
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('is instanceof HttpStatusError', () => {
    expect(err).toBeInstanceOf(HttpStatusError);
  });

  it('has correct code', () => {
    expect(err.code).toBe(DownloadErrorCode.HTTP_STATUS);
  });

  it('has correct name', () => {
    expect(err.name).toBe('HttpStatusError');
  });

  it('has descriptive message', () => {
    expect(err.message).toBe('HTTP 404 Not Found');
  });

  it('has status property', () => {
    expect(err.status).toBe(404);
  });

  it('has statusText property', () => {
    expect(err.statusText).toBe('Not Found');
  });

  it('works with other status codes', () => {
    const err403 = new HttpStatusError(403, 'Forbidden');
    expect(err403.status).toBe(403);
    expect(err403.statusText).toBe('Forbidden');
    expect(err403.message).toBe('HTTP 403 Forbidden');
  });
});

describe('NetworkError', () => {
  const err = new NetworkError();

  it('is instanceof DownloadError', () => {
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('is instanceof NetworkError', () => {
    expect(err).toBeInstanceOf(NetworkError);
  });

  it('has correct code', () => {
    expect(err.code).toBe(DownloadErrorCode.NETWORK);
  });

  it('has correct name', () => {
    expect(err.name).toBe('NetworkError');
  });

  it('has descriptive message', () => {
    expect(err.message).toContain('Network');
  });

  it('accepts optional cause', () => {
    const cause = new Error('original error');
    const errWithCause = new NetworkError(cause);
    expect(errWithCause.cause).toBe(cause);
  });
});

describe('TimeoutError', () => {
  const err = new TimeoutError(30000);

  it('is instanceof DownloadError', () => {
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('is instanceof TimeoutError', () => {
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it('has correct code', () => {
    expect(err.code).toBe(DownloadErrorCode.XHR_TIMEOUT);
  });

  it('has correct name', () => {
    expect(err.name).toBe('TimeoutError');
  });

  it('has descriptive message including timeout value', () => {
    expect(err.message).toContain('30000');
  });

  it('has timeoutMs property', () => {
    expect(err.timeoutMs).toBe(30000);
  });

  it('stores the exact timeout value', () => {
    const err5s = new TimeoutError(5000);
    expect(err5s.timeoutMs).toBe(5000);
  });
});

describe('AbortDownloadError', () => {
  const err = new AbortDownloadError();

  it('is instanceof DownloadError', () => {
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('is instanceof AbortDownloadError', () => {
    expect(err).toBeInstanceOf(AbortDownloadError);
  });

  it('has correct code', () => {
    expect(err.code).toBe(DownloadErrorCode.ABORTED);
  });

  it('has correct name', () => {
    expect(err.name).toBe('AbortDownloadError');
  });

  it('has descriptive message', () => {
    expect(err.message).toContain('abort');
  });
});

describe('InvalidBlobResponseError', () => {
  const err = new InvalidBlobResponseError();

  it('is instanceof DownloadError', () => {
    expect(err).toBeInstanceOf(DownloadError);
  });

  it('is instanceof InvalidBlobResponseError', () => {
    expect(err).toBeInstanceOf(InvalidBlobResponseError);
  });

  it('has correct code', () => {
    expect(err.code).toBe(DownloadErrorCode.INVALID_BLOB_RESPONSE);
  });

  it('has correct name', () => {
    expect(err.name).toBe('InvalidBlobResponseError');
  });

  it('has descriptive message mentioning Blob', () => {
    expect(err.message).toContain('Blob');
  });
});

describe('DownloadError base class', () => {
  it('has correct code, name, message', () => {
    const err = new DownloadError('Something went wrong', DownloadErrorCode.INVALID_INPUT);
    expect(err.code).toBe(DownloadErrorCode.INVALID_INPUT);
    expect(err.name).toBe('DownloadError');
    expect(err.message).toBe('Something went wrong');
  });

  it('stores optional cause', () => {
    const cause = new TypeError('bad type');
    const err = new DownloadError('Wrapped error', DownloadErrorCode.BLOB_CREATION_FAILED, cause);
    expect(err.cause).toBe(cause);
  });
});
