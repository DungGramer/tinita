/**
 * Values a custom property can take. `null` removes the property.
 *
 * A number is written as-is, so `{ zIndex: 10 }` becomes `--zIndex: 10`. That is
 * valid for unitless properties and wrong for lengths - CSS needs `64px`, not `64`.
 * Pass the unit yourself.
 */
export type CssVariableValue = string | number | null;

/**
 * Set or remove CSS custom properties on an element.
 *
 * Keys are written with a `--` prefix, and a key that already starts with `--` is
 * not double-prefixed - so `'footer-height'` and `'--footer-height'` both produce
 * `--footer-height`.
 *
 * A `null` value **removes** the property rather than writing the string `"null"`,
 * which is what `setProperty` would otherwise store.
 *
 * Properties are set as **inline style** on `target`, so they win over any
 * stylesheet. The default target is `document.documentElement`, which makes the
 * variables global to the page - that is a mutation of the host document, so pass a
 * narrower element when the scope should be narrower.
 *
 * @throws {TypeError} if `variables` is not an object, if `target` has no `style`,
 *   or if a key is empty or contains a character invalid in a custom property name.
 *   An invalid name is **silently ignored** by `setProperty`, so without this check
 *   a typo looks like it worked.
 *
 * @example
 * ```ts
 * setCssVariables({ 'footer-height': '64px', 'z-top': 100 });
 * setCssVariables({ 'footer-height': null });        // removes it
 * setCssVariables({ gap: '8px' }, panelElement);     // scoped to one element
 * ```
 */
export function setCssVariables(
  variables: Record<string, CssVariableValue>,
  target: ElementCSSInlineStyle = document.documentElement
): void {
  if (variables === null || typeof variables !== 'object') {
    throw new TypeError(
      `setCssVariables: expected an object, got ${variables === null ? 'null' : typeof variables}`
    );
  }
  if (
    !target ||
    !('style' in target) ||
    typeof target.style?.setProperty !== 'function'
  ) {
    throw new TypeError('setCssVariables: target has no inline style');
  }

  for (const [rawName, value] of Object.entries(variables)) {
    const name = rawName.startsWith('--') ? rawName.slice(2) : rawName;

    // `setProperty` ignores an invalid name without a word, so a typo such as
    // `'footer height'` would read as a successful write.
    if (name === '' || /[\s;:{}()'"\\]/.test(name)) {
      throw new TypeError(
        `setCssVariables: ${JSON.stringify(rawName)} is not a valid custom property name`
      );
    }

    if (value === null) {
      target.style.removeProperty(`--${name}`);
    } else {
      target.style.setProperty(`--${name}`, String(value));
    }
  }
}
