/**
 * Format a duration in milliseconds into a human-readable string.
 * Returns `'--'` for `null` or negative values.
 * Returns `'< 1s'` for durations shorter than one second.
 *
 * @param ms - Duration in milliseconds, or `null` for an unknown duration
 * @returns Human-readable string such as `"2h 15m 3s"`, `"45s"`, `"< 1s"`, or `"--"`
 *
 * @example
 * formatDuration(null)     // => '--'
 * formatDuration(-1)       // => '--'
 * formatDuration(500)      // => '< 1s'
 * formatDuration(1000)     // => '1s'
 * formatDuration(65_000)   // => '1m 5s'
 * formatDuration(3_661_000) // => '1h 1m 1s'
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return '--';
  if (ms < 1000) return '< 1s';

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
