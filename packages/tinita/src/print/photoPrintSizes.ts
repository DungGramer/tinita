export interface PhotoPrintSize {
  /** Stable identifier, the spelling a print lab's API expects. */
  key: string;
  /** Human-readable, for a picker. */
  label: string;
  /** Millimetres. */
  width: number;
  /** Millimetres. */
  height: number;
  /** `width / height`, derived - never stored, so it cannot drift. */
  ratio: number;
}

const MM_PER_INCH = 25.4;
const inches = (value: number): number => value * MM_PER_INCH;

/**
 * Photo lab print sizes, dimensions in millimetres.
 *
 * Not a standard. Unlike `PAGE_SIZES`, which is ISO 216/217, this is the set of
 * sizes photo labs sell, so treat it as a convenient default rather than an
 * authority - a given lab's list will differ.
 *
 * `A4` and `A3` are the ISO values (210x297 and 297x420 mm) so the whole table is
 * in one unit. The version this replaced stored `ratio` directly and computed it on
 * **three different bases** in one twelve-row table: inches for `8INX10IN`
 * (`8 / 10`), pixels at 300dpi for `A4` (`2480 / 3508`), and a hand-written `1` for
 * `14INX14IN`. The A4 value was 0.707012 against the true 0.707071.
 *
 * `ratio` is now derived from `width / height` at module load, so it cannot disagree
 * with the dimensions.
 *
 * @example
 * ```ts
 * PHOTO_PRINT_SIZES.find((size) => size.key === 'A4');
 * // { key: 'A4', label: 'A4', width: 210, height: 297, ratio: 0.7070707... }
 * ```
 */
export const PHOTO_PRINT_SIZES: readonly PhotoPrintSize[] = [
  { key: '8INX10IN', label: '8 x 10 in', width: inches(8), height: inches(10) },
  {
    key: '8_5INX11IN',
    label: '8.5 x 11 in',
    width: inches(8.5),
    height: inches(11),
  },
  {
    key: '10INX12IN',
    label: '10 x 12 in',
    width: inches(10),
    height: inches(12),
  },
  {
    key: '10INX14IN',
    label: '10 x 14 in',
    width: inches(10),
    height: inches(14),
  },
  {
    key: '11INX14IN',
    label: '11 x 14 in',
    width: inches(11),
    height: inches(14),
  },
  {
    key: '11INX17IN',
    label: '11 x 17 in',
    width: inches(11),
    height: inches(17),
  },
  {
    key: '14INX14IN',
    label: '14 x 14 in',
    width: inches(14),
    height: inches(14),
  },
  {
    key: '14INX17IN',
    label: '14 x 17 in',
    width: inches(14),
    height: inches(17),
  },
  { key: '24CMX24CM', label: '24 x 24 cm', width: 240, height: 240 },
  { key: '24CMX30CM', label: '24 x 30 cm', width: 240, height: 300 },
  { key: 'A4', label: 'A4', width: 210, height: 297 },
  { key: 'A3', label: 'A3', width: 297, height: 420 },
].map((size) => ({ ...size, ratio: size.width / size.height }));
