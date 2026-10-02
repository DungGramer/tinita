/**
 * The five chrome icons, inline.
 *
 * Not from `lucide-react`: it is an **optional** peer, so importing it here would
 * make this component throw in any consumer who did not install it. `Tree` takes the
 * same position and accepts a `ReactNode` instead; only `FileTree`, which is an
 * adapter for file listings, depends on an icon library.
 *
 * `aria-hidden` on every one: the accessible name lives on the button's `aria-label`,
 * so announcing the glyph as well would read the control twice.
 */

const SHARED = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export const MinimizeIcon = () => (
  <svg {...SHARED}>
    <path d="M5 12h14" />
  </svg>
);

export const MaximizeIcon = () => (
  <svg {...SHARED}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const RestoreIcon = () => (
  <svg {...SHARED}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...SHARED}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const WindowIcon = () => (
  <svg {...SHARED}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
  </svg>
);
