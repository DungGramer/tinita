/**
 * The registration surface a plugin is handed.
 *
 * A plugin receives this, not the instance, so the only thing it can do is add
 * types. That keeps `extend` from becoming an arbitrary patch point - the same
 * reason `HtmlPluginApi` exposes only `addEntities`.
 */
export interface MimePluginApi {
  /**
   * Register media types.
   *
   * Two directions, because the mapping is not symmetric: `image/jpeg` owns `jpg`,
   * `jpeg` and `jpe`, so extension -> type has three entries while type ->
   * extension has one, the preferred spelling.
   *
   * A key already registered is **skipped**, in both directions: the first
   * registration wins. So the default table always beats a plugin, and
   * `mime.extend(full)` adds the long tail without moving anything underneath a
   * caller who already relies on it.
   */
  addTypes(
    typeToExtension: Readonly<Record<string, string>>,
    extensionToType: Readonly<Record<string, string>>
  ): void;
}

/**
 * A plugin is a function that registers media types.
 *
 * @example
 * ```ts
 * const heic: MimePlugin = (api) => {
 *   api.addTypes({ 'image/heic': 'heic' }, { heic: 'image/heic' });
 * };
 * ```
 */
export type MimePlugin = (api: MimePluginApi) => void;

export interface Mime {
  /**
   * The media type for a file extension, or `undefined`.
   *
   * The extension is matched case-insensitively and a leading `.` is allowed, so
   * `'PNG'`, `'png'` and `'.png'` all work.
   *
   * `undefined`, not a guess. The version this replaced fell back to
   * `mimeType.split('/').pop()`, which produced `'vnd.ms-excel'` as if it were a
   * file extension - garbage dressed as a result.
   *
   * @throws {TypeError} if `extension` is not a string.
   */
  fromExtension(extension: string): string | undefined;

  /**
   * The media type for a file name, or `undefined`.
   *
   * Reads the extension with `getFileNameParts`, so a dotfile has no extension and
   * `archive.tar.gz` resolves on `gz`.
   *
   * @throws {TypeError} if `fileName` is not a string.
   */
  fromFileName(fileName: string): string | undefined;

  /**
   * The preferred file extension for a media type, or `undefined`.
   *
   * Preferred means the first extension `mime-db` lists, so `image/jpeg` gives
   * `'jpg'`, not `'jpeg'`. Parameters are stripped, so
   * `'text/plain;charset=utf-8'` resolves as `'text/plain'`.
   *
   * This is **not** the exact inverse of `fromExtension`: three extensions map to
   * `image/jpeg` and only one comes back.
   *
   * @throws {TypeError} if `mimeType` is not a string.
   */
  toExtension(mimeType: string): string | undefined;

  /**
   * Turn an `accept` attribute into a RegExp that tests a **file name**.
   *
   * Accepts the forms HTML allows: extensions (`.pdf`), full types (`image/png`),
   * and wildcards (`image/*`), comma-separated with or without spaces. A wildcard
   * expands to every registered extension under that top-level type, so it sees
   * more formats after `mime.extend(full)`.
   *
   * The returned pattern is anchored on a literal dot at the end of the name. The
   * version this replaced produced `/(png|jpeg)$/i`, which accepted `notapng` and
   * `bigpng` - a file filter that let through files it was built to block.
   *
   * An empty or fully unrecognised `accept` yields a pattern that matches
   * **nothing**. The version this replaced returned `new RegExp('')`, which matched
   * everything, `.exe` included.
   *
   * @throws {TypeError} if `accept` is not a string.
   */
  acceptToRegExp(accept: string): RegExp;

  /**
   * Register a plugin and return the same instance, so calls chain.
   *
   * Applying the same plugin twice is a no-op.
   */
  extend(plugin: MimePlugin): Mime;
}
