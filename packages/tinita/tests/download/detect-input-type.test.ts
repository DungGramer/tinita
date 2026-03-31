import { describe, it, expect } from 'vitest';
import { detectInputType } from '../../src/download/core/detect-input-type';

describe('detectInputType', () => {
  it('File -> file (checked before Blob)', () => {
    expect(detectInputType(new File(['hi'], 'hi.txt'))).toBe('file');
  });

  it('Blob -> blob', () => {
    expect(detectInputType(new Blob(['hi']))).toBe('blob');
  });

  it('ArrayBuffer -> arraybuffer', () => {
    expect(detectInputType(new ArrayBuffer(8))).toBe('arraybuffer');
  });

  it('Uint8Array -> uint8array', () => {
    expect(detectInputType(new Uint8Array([1, 2, 3]))).toBe('uint8array');
  });

  it('Response -> response', () => {
    expect(detectInputType(new Response('body'))).toBe('response');
  });

  it('URL object -> url-object', () => {
    expect(detectInputType(new URL('https://example.com'))).toBe('url-object');
  });

  it('data: string -> data-url', () => {
    expect(detectInputType('data:text/plain;base64,aGk=')).toBe('data-url');
    expect(detectInputType('data:image/png;base64,abc')).toBe('data-url');
  });

  it('https:// string -> url-string', () => {
    expect(detectInputType('https://example.com/file.pdf')).toBe('url-string');
  });

  it('http:// string -> url-string', () => {
    expect(detectInputType('http://example.com/file.csv')).toBe('url-string');
  });

  it('blob: string -> url-string', () => {
    expect(detectInputType('blob:http://localhost/abc-123')).toBe('url-string');
  });

  it('plain string -> text', () => {
    expect(detectInputType('Hello, world!')).toBe('text');
    expect(detectInputType('col1,col2\n1,2')).toBe('text');
    expect(detectInputType('')).toBe('text');
  });

  it('File is not detected as blob', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    expect(detectInputType(file)).not.toBe('blob');
    expect(detectInputType(file)).toBe('file');
  });
});
