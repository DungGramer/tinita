/**
 * Truncate file name if too long while preserving extension
 *
 * @param fileName - Full file name with extension
 * @param maxLength - Maximum length for the truncated name (default: 30)
 * @returns Truncated file name with "..." in the middle
 *
 * @example
 * truncateFileName("very-long-document-name.pdf", 20) // => "very-long-do...pdf"
 * truncateFileName("short.pdf", 30) // => "short.pdf"
 */
export function truncateFileName(fileName: string, maxLength = 30): string {
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.substring(0, fileName.length - extension.length - 1);
  const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);

  return `${truncatedName}...${extension}`;
}
