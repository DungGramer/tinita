// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { isBrowser, assertBrowser, supportsDownloadAttribute, supportsMsSaveBlob } from '../../src/download/env';
import { DownloadError, DownloadErrorCode } from '../../src/download/errors';

describe('env (browser environment)', () => {
  describe('isBrowser()', () => {
    it('returns true in happy-dom (window + document available)', () => {
      expect(isBrowser()).toBe(true);
    });
  });

  describe('assertBrowser()', () => {
    it('does not throw in happy-dom environment', () => {
      expect(() => assertBrowser('test-operation')).not.toThrow();
    });
  });

  describe('supportsDownloadAttribute()', () => {
    it('returns a boolean in happy-dom', () => {
      const result = supportsDownloadAttribute();
      expect(typeof result).toBe('boolean');
    });

    it('returns true because happy-dom createElement("a") supports download', () => {
      // happy-dom implements download attribute
      const anchor = document.createElement('a');
      const supported = 'download' in anchor;
      expect(supportsDownloadAttribute()).toBe(supported);
    });
  });

  describe('supportsMsSaveBlob()', () => {
    it('returns false in happy-dom (not IE)', () => {
      expect(supportsMsSaveBlob()).toBe(false);
    });
  });
});
