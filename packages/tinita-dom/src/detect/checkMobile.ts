export function isIOS() {
  return (
    // iPad on iOS 13+ detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document) ||
    // Other iOS device detection
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

export function isIOSWebView() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
  return isIOS && !isSafari && !/CriOS|FxiOS|OPiOS/.test(ua);
}

export function isMobile() {
  const toMatch = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
  ];

  return toMatch.some((toMatchItem) => {
    return navigator.userAgent.match(toMatchItem);
  });
}

export function isAndroid() {
  return !!navigator.userAgent.match(/Android/i);
}

export function isTouchDevice() {
  return (
    !isWindows() &&
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator['msMaxTouchPoints'] > 0)
  );
}
