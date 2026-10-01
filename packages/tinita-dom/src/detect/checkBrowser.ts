export function isChrome() {
  return (
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  );
}

export function isFirefox() {
  return (
    /Firefox/.test(navigator.userAgent) || typeof InstallTrigger !== 'undefined'
  );
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
