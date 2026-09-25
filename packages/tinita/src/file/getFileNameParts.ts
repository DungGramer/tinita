/**
 * Extract file name and extension from a file name string.
 *
 * Follows Node's `path.extname` rule for dotfiles: a dot at position 0 starts a
 * dotfile name, it does not start an extension. A trailing dot is kept in the
 * name so that `name + ('.' + extension)` always reconstructs the input.
 *
 * @param fileName - The full file name (e.g. "document.pdf")
 * @returns Tuple of [name, extension], extension without the leading dot
 *
 * @example
 * getFileNameParts("document.pdf")  // => ["document", "pdf"]
 * getFileNameParts("my.file.txt")   // => ["my.file", "txt"]
 * getFileNameParts("noextension")   // => ["noextension", ""]
 * getFileNameParts("")              // => ["", ""]
 *
 * @example
 * // Dotfiles are names, not extensions.
 * getFileNameParts(".gitignore")    // => [".gitignore", ""]
 * getFileNameParts(".env.local")    // => [".env", "local"]
 *
 * @example
 * // Trailing dot stays in the name, so the input can be rebuilt exactly.
 * getFileNameParts("trailing.")     // => ["trailing.", ""]
 */
export function getFileNameParts(fileName: string): [string, string] {
  if (!fileName) return ['', ''];

  const lastDot = fileName.lastIndexOf('.');

  // lastDot < 0  : no dot at all
  // lastDot === 0: dotfile, the dot starts the name
  // lastDot last : trailing dot, no extension follows it
  if (lastDot <= 0 || lastDot === fileName.length - 1) return [fileName, ''];

  return [fileName.slice(0, lastDot), fileName.slice(lastDot + 1)];
}
