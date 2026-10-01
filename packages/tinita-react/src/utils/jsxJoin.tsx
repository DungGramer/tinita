import { Fragment, type ReactNode } from 'react';

/**
 * Join React nodes with a separator, the way `Array.prototype.join` joins strings.
 *
 * ```tsx
 * jsxJoin(names.map((n) => <b key={n}>{n}</b>), <span>, </span>)
 * ```
 *
 * Returns `null` for an empty array, so it drops straight into JSX.
 *
 * Three things the version this replaced got wrong:
 *
 * - It was typed `<T extends JSX.Element>`. The global `JSX` namespace is gone
 *   under the modern JSX transform, so the type did not resolve at all. `ReactNode`
 *   is also the honest type here: a caller can pass strings or numbers.
 * - It declared a return of `T` and then returned `null`, and the `reduce` produced
 *   a Fragment rather than a `T`. Neither matched.
 * - Its Fragments carried no `key`, so React logged a warning for every separator.
 *
 * @example
 * ```tsx
 * jsxJoin(['a', 'b'], ' | ');   // a | b
 * jsxJoin([], ' | ');           // null
 * ```
 */
export function jsxJoin(nodes: ReactNode[], separator: ReactNode): ReactNode {
  const present = nodes?.filter((node) => node !== null && node !== undefined) ?? [];
  if (present.length === 0) return null;

  return present.map((node, index) => (
    // Index as key is safe here and only here: this list is derived from the
    // caller's array in order, it is never reordered, and the Fragment holds no
    // state of its own.
    <Fragment key={index}>
      {index > 0 ? separator : null}
      {node}
    </Fragment>
  ));
}
