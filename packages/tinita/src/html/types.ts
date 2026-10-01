/**
 * The registration surface a plugin is handed.
 *
 * A plugin receives this, not the instance itself, so the only thing it can do is
 * add entities. That keeps `extend` from becoming an arbitrary patch point.
 */
export interface HtmlPluginApi {
  /**
   * Register character -> entity pairs.
   *
   * Values missing a trailing `;` get one added: `&bne` followed by any text reads
   * as a different, undefined entity name, so a browser prints it verbatim.
   *
   * A pair whose entity is already claimed by another character is skipped, and
   * the first registration wins. Allowing two characters to share one entity would
   * break the round-trip invariant for whichever one decoded second.
   */
  addEntities(entities: Readonly<Record<string, string>>): void;
}

/**
 * A plugin is a function that registers entities.
 *
 * @example
 * ```ts
 * const myPlugin: HtmlPlugin = (api) => {
 *   api.addEntities({ '©': '&copy;' });
 * };
 * ```
 */
export type HtmlPlugin = (api: HtmlPluginApi) => void;

export interface Html {
  /**
   * Replace every registered character with its entity.
   *
   * Out of the box this covers only the five characters HTML requires escaping:
   * `&`, `<`, `>`, `"` and `'`. Extend with the `entities` plugin for the full
   * named set.
   *
   * @throws {TypeError} if `input` is not a string.
   */
  encode(input: string): string;

  /**
   * Turn entities back into characters.
   *
   * Handles every registered named entity plus numeric references in decimal
   * (`&#60;`) and hexadecimal (`&#x3C;`) form, with or without the trailing `;`.
   * An unrecognised entity is left exactly as it was.
   *
   * @throws {TypeError} if `input` is not a string.
   */
  decode(input: string): string;

  /**
   * Register a plugin and return the same instance, so calls chain.
   *
   * Applying the same plugin twice is a no-op.
   */
  extend(plugin: HtmlPlugin): Html;
}
