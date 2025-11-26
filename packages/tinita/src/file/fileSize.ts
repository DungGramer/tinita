/**
 * Convert file size to human readable format
 * Base 10: 1 KB = 1000 Bytes
 * Base 2: 1 KB = 1024 Bytes
 *
 * @param size - File size in bytes
 * @param base - Base for conversion (1000 or 1024, default: 1000)
 * @returns Human-readable file size string
 *
 * @example
 * fileSize(1024) // => "1.02 KB"
 * fileSize(1024, 1024) // => "1 KB"
 * fileSize(0) // => "0 Byte"
 */
export function fileSize(size: number, base: 1000 | 1024 = 1000): string {
  if (size === 0) return '0 Byte';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const indexBySize = Math.floor(Math.log(size) / Math.log(base));

  return `${Number.parseFloat((size / base ** indexBySize).toFixed(2))} ${sizes[indexBySize]}`;
}
