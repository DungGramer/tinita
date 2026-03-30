// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createObjectUrl } from '../../src/download/create-object-url';
import { createAnchor } from '../../src/download/create-anchor';
import { triggerDownload } from '../../src/download/trigger-download';

// happy-dom may not implement URL.createObjectURL — mock if needed
function setupObjectUrlMocks() {
  const created: string[] = [];
  const revoked: string[] = [];

  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:mock-${Math.random()}`;
      created.push(url);
      return url;
    });
  } else {
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      const url = `blob:mock-${Math.random()}`;
      created.push(url);
      return url;
    });
  }

  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      revoked.push(url);
    });
  }

  return { created, revoked };
}

describe('createObjectUrl', () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    const mocks = setupObjectUrlMocks();
    created = mocks.created;
    revoked = mocks.revoked;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns handle with a url string', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const handle = createObjectUrl(blob);
    expect(typeof handle.url).toBe('string');
    expect(handle.url.length).toBeGreaterThan(0);
  });

  it('calls URL.createObjectURL with the blob', () => {
    const blob = new Blob(['content']);
    createObjectUrl(blob);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('revoke() calls URL.revokeObjectURL', () => {
    const blob = new Blob(['data']);
    const handle = createObjectUrl(blob);
    handle.revoke();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(handle.url);
  });

  it('double revoke does not call revokeObjectURL twice', () => {
    const blob = new Blob(['data']);
    const handle = createObjectUrl(blob);
    handle.revoke();
    handle.revoke(); // second call should be no-op
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('scheduleRevoke revokes after delay', async () => {
    vi.useFakeTimers();
    const blob = new Blob(['data']);
    const handle = createObjectUrl(blob);
    handle.scheduleRevoke(1000);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(handle.url);
    vi.useRealTimers();
  });

  it('scheduleRevoke with default delay uses DEFAULT_REVOKE_DELAY', async () => {
    vi.useFakeTimers();
    const blob = new Blob(['data']);
    const handle = createObjectUrl(blob);
    handle.scheduleRevoke(); // default 40_000 ms
    vi.advanceTimersByTime(39_999);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('createAnchor', () => {
  it('creates anchor with correct href', () => {
    const anchor = createAnchor({ href: 'blob:test-url', filename: 'file.txt' });
    expect(anchor.href).toBe('blob:test-url');
  });

  it('sets download attribute to filename', () => {
    const anchor = createAnchor({ href: 'blob:url', filename: 'report.pdf' });
    expect(anchor.download).toBe('report.pdf');
  });

  it('sets display:none', () => {
    const anchor = createAnchor({ href: 'blob:url', filename: 'file.txt' });
    expect(anchor.style.display).toBe('none');
  });

  it('does not set target or rel by default', () => {
    const anchor = createAnchor({ href: 'blob:url', filename: 'file.txt' });
    expect(anchor.target).not.toBe('_blank');
  });

  it('sets target=_blank and rel when newTab=true', () => {
    const anchor = createAnchor({ href: 'blob:url', filename: 'file.txt', newTab: true });
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
  });

  it('returns an HTMLAnchorElement', () => {
    const anchor = createAnchor({ href: 'blob:url', filename: 'file.txt' });
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
  });
});

describe('triggerDownload', () => {
  beforeEach(() => {
    setupObjectUrlMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns clicked=true and revoked=false', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    const blob = new Blob(['content'], { type: 'text/plain' });
    const objectUrl = URL.createObjectURL(blob);

    const result = triggerDownload({ blob, filename: 'test.txt', objectUrl, autoRevoke: false });

    expect(result.clicked).toBe(true);
    expect(result.revoked).toBe(false);

    clickSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('appends anchor to document.body before click', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendedElements: Element[] = [];
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      appendedElements.push(node as Element);
      return node as any;
    });

    const blob = new Blob(['content']);
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload({ blob, filename: 'file.txt', objectUrl, autoRevoke: false });

    expect(appendedElements.length).toBeGreaterThan(0);
    const anchor = appendedElements[0] as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.download).toBe('file.txt');

    clickSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('cleanup() revokes object URL', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const blob = new Blob(['content']);
    const objectUrl = URL.createObjectURL(blob);
    const result = triggerDownload({ blob, filename: 'file.txt', objectUrl, autoRevoke: false });

    result.cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('autoRevoke=true schedules revocation after delay', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const blob = new Blob(['content']);
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload({ blob, filename: 'file.txt', objectUrl, revokeDelay: 5000, autoRevoke: true });

    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(objectUrl);
    vi.advanceTimersByTime(5000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
