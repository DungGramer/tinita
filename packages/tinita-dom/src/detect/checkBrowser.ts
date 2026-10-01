export function isChrome() {
  return (
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  );
}

export function isFirefox() {
  // `InstallTrigger` was Firefox's old tell. It is not a declared global, and
  // Firefox removed it in 2023, so it is read off `globalThis` as a fallback
  // rather than referenced bare - a bare reference is a ReferenceError under
  // TypeScript's `noImplicitAny` and does nothing for current Firefox anyway.
  const hasInstallTrigger =
    (globalThis as { InstallTrigger?: unknown }).InstallTrigger !== undefined;

  return /Firefox/.test(navigator.userAgent) || hasInstallTrigger;
}

export function isSafari() {
  return (
    /Safari/.test(navigator.userAgent) &&
    /Apple Computer/.test(navigator.vendor)
  );
}

export function isEdge() {
  return /Edge/.test(navigator.userAgent);
}

export function isIE() {
  return /MSIE/.test(navigator.userAgent);
}
