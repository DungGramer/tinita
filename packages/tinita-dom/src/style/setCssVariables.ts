/* eslint-disable @typescript-eslint/no-explicit-any -- phase 06 raises this to the gate. */
/**
 * Set to style inline
 * @example: setCssVariables({ footer-height: 64px }) => --footer-height: 64px
 */
export function setCssVariables(
  object: Record<string, any>,
  targetElement = document.documentElement
): void {
  for (const [key, value] of Object.entries(object)) {
    targetElement.style.setProperty(`--${key}`, value);
  }
}
