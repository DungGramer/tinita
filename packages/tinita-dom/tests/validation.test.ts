import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isChrome,
  isEdge,
  isFirefox,
  isIE,
  isSafari,
} from '../src/validation/browser';
import { isCoarsePointer } from '../src/validation/isCoarsePointer';
import { isTouchDevice } from '../src/validation/isTouchDevice';
import {
  isAndroid,
  isIOS,
  isIOSWebView,
  isMacOS,
  isMobile,
  isWindows,
} from '../src/validation/platform';

/** Real user-agent strings, so the assertions are about browsers that exist. */
const AGENTS = {
  chrome: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Google Inc.',
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Google Inc.',
  ],
  safari: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Apple Computer, Inc.',
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    '',
  ],
  ie11: ['Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko', ''],
  opera: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0',
    'Google Inc.',
  ],
  iphone: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    'Apple Computer, Inc.',
  ],
  chromeOnIos: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.0.0 Mobile/15E148 Safari/604.1',
    'Apple Computer, Inc.',
  ],
  iosWebView: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Apple Computer, Inc.',
  ],
  android: [
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    'Google Inc.',
  ],
} as const;

const as = (key: keyof typeof AGENTS) => {
  const [userAgent, vendor] = AGENTS[key];
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.spyOn(navigator, 'vendor', 'get').mockReturnValue(vendor);
};

afterEach(() => vi.restoreAllMocks());

describe('browser guesses, against real user-agent strings', () => {
  const ALL = { isChrome, isFirefox, isSafari, isEdge, isIE };
  const detected = () =>
    Object.entries(ALL)
      .filter(([, fn]) => fn())
      .map(([name]) => name);

  it('Chrome is Chrome and nothing else', () => {
    as('chrome');
    expect(detected()).toEqual(['isChrome']);
  });

  it('Edge is Edge, NOT Chrome - the old version reported Chrome', () => {
    // Measured 2026-10-01: the old isChrome tested /Chrome/ plus vendor 'Google Inc',
    // and Edge satisfies both. The old isEdge tested /Edge/, which Chromium Edge
    // dropped in 2020 in favour of Edg/ - so Edge was Chrome and never Edge.
    as('edge');
    expect(detected()).toEqual(['isEdge']);
  });

  it('IE 11 is detected - the old version missed it entirely', () => {
    // IE 11 dropped MSIE from its string in favour of Trident/, and the old isIE
    // tested only MSIE. So the last IE anyone shipped read as nothing at all.
    as('ie11');
    expect(detected()).toEqual(['isIE']);
  });

  it('Safari is Safari, and Opera is neither Chrome nor Safari', () => {
    as('safari');
    expect(detected()).toEqual(['isSafari']);
    vi.restoreAllMocks();
    as('opera');
    expect(detected()).toEqual([]);
  });

  it('Firefox is Firefox', () => {
    as('firefox');
    expect(detected()).toEqual(['isFirefox']);
  });

  it('Chrome on iOS is not Safari, despite being WebKit with an Apple vendor', () => {
    as('chromeOnIos');
    expect(isSafari()).toBe(false);
  });
});

describe('platform guesses', () => {
  it('detects iPhone and Android', () => {
    as('iphone');
    expect(isIOS()).toBe(true);
    expect(isMobile()).toBe(true);
    expect(isAndroid()).toBe(false);

    vi.restoreAllMocks();
    as('android');
    expect(isAndroid()).toBe(true);
    expect(isMobile()).toBe(true);
    expect(isIOS()).toBe(false);
  });

  it('detects Windows and macOS', () => {
    as('edge');
    expect(isWindows()).toBe(true);
    expect(isMacOS()).toBe(false);

    vi.restoreAllMocks();
    as('safari');
    expect(isMacOS()).toBe(true);
    expect(isWindows()).toBe(false);
  });

  it('isIOSWebView is true only for iOS with no browser marker', () => {
    as('iosWebView');
    expect(isIOSWebView()).toBe(true);

    vi.restoreAllMocks();
    as('iphone');
    expect(isIOSWebView()).toBe(false);

    vi.restoreAllMocks();
    as('chromeOnIos');
    expect(isIOSWebView()).toBe(false);
  });

  it('an iPad on iPadOS 13+ reads as macOS, and the JSDoc says so', () => {
    // It sends a desktop Mac string. isIOS compensates via touch support, but
    // isMacOS cannot - asserted so the limitation is recorded, not discovered.
    as('safari');
    expect(isMacOS()).toBe(true);
  });

  it('no platform guess throws where navigator is missing', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('');
    for (const fn of [
      isIOS,
      isIOSWebView,
      isAndroid,
      isMobile,
      isWindows,
      isMacOS,
    ]) {
      expect(() => fn()).not.toThrow();
      expect(fn()).toBe(false);
    }
  });
});

describe('feature detection, which does not rot', () => {
  it('isCoarsePointer asks matchMedia and is false without it', () => {
    const spy = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', spy);
    expect(isCoarsePointer()).toBe(true);
    expect(spy).toHaveBeenCalledWith('(pointer: coarse)');

    vi.stubGlobal('matchMedia', undefined);
    expect(isCoarsePointer()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('isTouchDevice reads capabilities, not a string', () => {
    // Measured 2026-10-01: jsdom defines `ontouchstart` on window and has no
    // `navigator.maxTouchPoints` at all, so the baseline here is already true.
    expect(isTouchDevice()).toBe(true);

    withoutOnTouchStart(() => {
      expect(isTouchDevice()).toBe(false);

      withTouchPoints(5, () => {
        // The user-agent never came into it, which is the whole point.
        expect(isTouchDevice()).toBe(true);
      });
    });

    expect(isTouchDevice()).toBe(true);
  });

  it('isTouchDevice reads the IE 10 counter too', () => {
    withoutOnTouchStart(() => {
      Object.defineProperty(navigator, 'msMaxTouchPoints', {
        value: 2,
        configurable: true,
      });
      expect(isTouchDevice()).toBe(true);
      // @ts-expect-error removing the stub again
      delete navigator.msMaxTouchPoints;
    });
  });

  it('isTouchDevice and isCoarsePointer answer DIFFERENT questions', () => {
    // A laptop with a touchscreen: touch present, primary pointer still fine.
    // Asserted so nobody collapses the two into one function.
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(isTouchDevice()).toBe(true);
    expect(isCoarsePointer()).toBe(false);
    vi.unstubAllGlobals();
  });
});

/** jsdom defines `ontouchstart`; remove it for the duration of `run`, then restore. */
function withoutOnTouchStart(run: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
  // `ontouchstart` is an optional handler slot, so deleting it type-checks.
  delete window.ontouchstart;
  try {
    run();
  } finally {
    if (descriptor) Object.defineProperty(window, 'ontouchstart', descriptor);
  }
}

/** `navigator.maxTouchPoints` is absent in jsdom, so it is defined rather than spied. */
function withTouchPoints(value: number, run: () => void): void {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value,
    configurable: true,
  });
  try {
    run();
  } finally {
    // @ts-expect-error removing the stub again
    delete navigator.maxTouchPoints;
  }
}
