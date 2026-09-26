import { type ClassValue, clsx } from 'clsx';

/**
 * Nối className. `clsx` thuần, KHÔNG `twMerge`.
 *
 * `tailwind-merge` chỉ có nghĩa khi có class Tailwind cần dedupe. Từ khi layout
 * của component chuyển hết sang CSS thật (BEM + data-attribute), không còn class
 * Tailwind nào trong JSX, nên `twMerge` chỉ còn là code chết được bundle vào mọi
 * consumer. Đo được 2026-09-26: `dist/ui/carousel-ticker/index.mjs` 31084 bytes
 * khi còn nó.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
