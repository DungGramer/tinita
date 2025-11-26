/**
 * Extract file name and extension from a file name string
 *
 * @param fileName - The full file name (e.g., "document.pdf")
 * @returns Tuple of [name, extension] (e.g., ["document", "pdf"])
 *
 * @example
 * getFileNameParts("document.pdf") // => ["document", "pdf"]
 * getFileNameParts("my.file.txt") // => ["my.file", "txt"]
 * getFileNameParts("noextension") // => ["noextension", ""]
 * getFileNameParts("") // => ["", ""]
 */
export function getFileNameParts(fileName: string): [string, string] {
  if (!fileName) {
    return ['', ''];
  }

  const fileNameParts = fileName.split('.');
  if (fileNameParts.length < 2) return [fileName, ''];

  const extension = fileNameParts.pop() as string;

  return [fileNameParts.join('.'), extension];
}
