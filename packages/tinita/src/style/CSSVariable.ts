/**
 * Set to style inline
 * @example: setObjectAsCSSVariables({ footer-height: 64px }) => --footer-height: 64px
 */
export function setObjectAsCSSVariables(
  object: Record<string, any>,
  targetElement = document.documentElement
): void {
  for (const [key, value] of Object.entries(object)) {
    targetElement.style.setProperty(`--${key}`, value);
  }
}
