const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Format a byte count into a human-readable string.
 * Uses base-1024 (binary) units.
 * Returns `'--'` for `null` or negative values.
 *
 * @param bytes - Number of bytes, or `null` for an unknown size
 * @param decimals - Number of decimal places to show (default `2`)
 * @returns Human-readable string such as `"1.50 MB"` or `"--"`
 *
 * @example
 * formatBytes(null)       // => '--'
 * formatBytes(-1)         // => '--'
 * formatBytes(0)          // => '0 B'
 * formatBytes(1024)       // => '1.00 KB'
 * formatBytes(1536, 1)    // => '1.5 KB'
 * formatBytes(1_073_741_824) // => '1.00 GB'
 */
export function formatBytes(bytes: number | null, base: 1000 | 1024 = 1000): string {
  if (bytes === null || bytes < 0) return '--';
  if (bytes === 0) return '0 B';

  const indexBySize = Math.floor(Math.log(bytes) / Math.log(base));

  return `${Number.parseFloat((bytes / base ** indexBySize).toFixed(2))} ${UNITS[indexBySize]}`;
}
