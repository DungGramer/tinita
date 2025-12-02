/**
 * Auto-inject styles utility
 *
 * Automatically injects CSS into the document when the component is used.
 * Only works in browser environment (SSR-safe).
 *
 * @param styleId - Unique ID for the style tag
 * @param cssContent - CSS content to inject
 */
export function autoInjectStyles(styleId: string, cssContent: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Check if styles are already injected
  if (document.getElementById(styleId)) {
    return;
  }

  // Create and inject style tag
  const styleTag = document.createElement('style');
  styleTag.id = styleId;
  styleTag.textContent = cssContent;
  document.head.appendChild(styleTag);
}

/**
 * Remove injected styles
 *
 * @param styleId - Unique ID for the style tag
 */
export function removeInjectedStyles(styleId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const styleTag = document.getElementById(styleId);
  if (styleTag) {
    styleTag.remove();
  }
}
