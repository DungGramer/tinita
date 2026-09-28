import { type ClassValue, clsx } from 'clsx';

/**
 * Join class names. Plain `clsx`, no `twMerge`.
 *
 * `tailwind-merge` only earns its bytes when there are Tailwind classes to
 * deduplicate. Component layout is all real CSS with data-attribute variants, so
 * there is no Tailwind class in the JSX and `twMerge` would be dead weight bundled
 * into every consumer.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
