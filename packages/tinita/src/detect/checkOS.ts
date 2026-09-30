export function isWindows() {
  return navigator.userAgent.includes('Win');
}

export function isMacOS() {
  return /Mac/i.test(navigator.userAgent);
}

export function isWindowsTouch() {
  return (
    isWindows() && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
}
