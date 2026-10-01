/**
 * Page sizes in millimetres: ISO 216 (A, B, C), ISO 217 (RA, SRA), and five North
 * American sizes.
 *
 * This **is** a standard, verified against it. Checked 2026-10-01: `A4` 210x297
 * (ISO 216), `C5` 162x229 (ISO 269), `SRA3` 320x450 (ISO 217), `LETTER`
 * 215.9x279.4 (8.5x11 in), `LEGAL` 215.9x355.6, `TABLOID` 279.4x431.8,
 * `EXECUTIVE` 184.15x266.7 (7.25x10.5 in) - 7 of 7 exact.
 *
 * Each value is `[width, height]` in portrait orientation. Swap them for landscape.
 *
 * `DEFAULT_MARGIN_PRINT` used to live in this file; it is one application's choice,
 * not a standard, so it moved to `print/defaultPrintMargins`.
 *
 * @example
 * ```ts
 * const [width, height] = PAGE_SIZES.A4;  // [210, 297]
 * ```
 */
export const PAGE_SIZES: Readonly<Record<string, readonly [number, number]>> = {
  '4A0': [1682, 2378],
  '2A0': [1189, 1682],
  'A0': [841, 1189],
  'A1': [594, 841],
  'A2': [420, 594],
  'A3': [297, 420],
  'A4': [210, 297],
  'A5': [148, 210],
  'A6': [105, 148],
  'A7': [74, 105],
  'A8': [52, 74],
  'A9': [37, 52],
  'A10': [26, 37],
  'B0': [1000, 1414],
  'B1': [707, 1000],
  'B2': [500, 707],
  'B3': [353, 500],
  'B4': [250, 353],
  'B5': [176, 250],
  'B6': [125, 176],
  'B7': [88, 125],
  'B8': [62, 88],
  'B9': [44, 62],
  'B10': [31, 44],
  'C0': [917, 1297],
  'C1': [648, 917],
  'C2': [458, 648],
  'C3': [324, 458],
  'C4': [229, 324],
  'C5': [162, 229],
  'C6': [114, 162],
  'C7': [81, 114],
  'C8': [57, 81],
  'C9': [40, 57],
  'C10': [28, 40],
  'RA0': [860, 1220],
  'RA1': [610, 860],
  'RA2': [430, 610],
  'RA3': [305, 430],
  'RA4': [215, 305],
  'SRA0': [900, 1280],
  'SRA1': [640, 900],
  'SRA2': [450, 640],
  'SRA3': [320, 450],
  'SRA4': [225, 320],
  'EXECUTIVE': [184.15, 266.7],
  'FOLIO': [210, 330],
  'LEGAL': [215.9, 355.6],
  'LETTER': [215.9, 279.4],
  'TABLOID': [279.4, 431.8],
};
