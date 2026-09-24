import { formatPlainNumber } from "./formatPlainNumber";
import { formatScaledNumber } from "./formatScaledNumber";

/**
 * Format number to compact alert format (K / M / B) with business-specific rounding rules.
 *
 * Rules:
 * - Invalid input (null, undefined, NaN, non-number, negative) → '--'
 * - 0 <= n < 1,000 → show full number (no suffix)
 * - 1,000 <= n < 1,000,000 → scale to K (thousands)
 * - 1,000,000 <= n < 1,000,000,000 → scale to M (millions)
 * - n >= 1,000,000,000 → scale to B (billions)
 *
 * Rounding:
 * - Values are rounded to maximum 2 decimal places
 * - Trailing zeros are removed (e.g. 1.50 → 1.5, 1.00 → 1)
 * - Rounding is applied after scaling (e.g. 1006 → 1.01K)
 *
 * Notes:
 * - Decimal separator is always '.'
 * - No locale-based formatting is applied
 * - Suffix is always uppercase: K, M, B
 *
 * Examples:
 * - 999 → '999'
 * - 1000 → '1K'
 * - 1006 → '1.01K'
 * - 234567 → '234.57K'
 * - 2134214 → '2.13M'
 * - 1000000000 → '1B'
 * - null / undefined / NaN → '--'
 *
 * @param {number} num - Input number
 * @returns {string} Formatted compact string
 */
export const formatNumberWithCompact = (num: number) => {
  if (num === null || num === undefined || Number.isNaN(num)) return '--';
  if (typeof num !== 'number') return '--';
  if (num < 0) return '--';
  if (num < 1000) return formatPlainNumber(num);
  if (num < 1000000) return `${formatScaledNumber(num / 1000)}K`;
  if (num < 1000000000) return `${formatScaledNumber(num / 1000000)}M`;

  return `${formatScaledNumber(num / 1000000000)}B`;
};
