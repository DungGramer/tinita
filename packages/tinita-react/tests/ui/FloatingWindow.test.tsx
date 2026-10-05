import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FloatingWindow, type FloatingWindowMode } from '../../src/ui/floating-window';

/**
 * Plain DOM assertions, no `@testing-library/jest-dom` - the package does not
 * install it and the other component tests here do the same.
 *
 * `useWindowSize` reads `window.innerWidth` through `useSyncExternalStore`, so the
 * size at render time is what the component sees. jsdom defaults to 1024x768, which
 * means the window is "measured" immediately unless a case sets it to 0 on purpose.
 */
const JSDOM_WIDTH = 1024;
const JSDOM_HEIGHT = 768;

function setViewport(width: number, height: number) {
  window.innerWidth = width;
  window.innerHeight = height;
}

function resize(width: number, height: number) {
  setViewport(width, height);
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

afterEach(() => {
  // `window.innerWidth` is global state; leaving it changed makes the NEXT file's
  // cases depend on the order this one ran in.
  setViewport(JSDOM_WIDTH, JSDOM_HEIGHT);
});

/** Dispatch a keydown that bubbles to `document`, optionally from a given element. */
function press(
  key: string,
  modifiers: Partial<Record<'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey', boolean>> = {},
  from: Element = document.body
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  act(() => {
    from.dispatchEvent(event);
  });
  return event;
}

function Harness({
  initialMode = 'windowed',
  children,
  ...rest
}: { initialMode?: FloatingWindowMode } & Partial<React.ComponentProps<typeof FloatingWindow>>) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<FloatingWindowMode>(initialMode);

  return (
    <FloatingWindow
      open={open}
      onOpenChange={setOpen}
      title="Dashboard"
      mode={mode}
      onModeChange={setMode}
      {...rest}
    >
      {/* Default body, overridable. Written as a fallback rather than hardcoded:
          JSX children between the tags BEAT a `children` arriving through the
          spread, so the first version of this harness silently dropped the
          <input> that two cases pass - and both cases failed for that reason,
          not for the behaviour they were written to check. */}
      {children ?? <p>body content</p>}
    </FloatingWindow>
  );
}

const rootOf = (baseElement: HTMLElement) => baseElement.querySelector<HTMLElement>('[data-mode]');

describe('FloatingWindow', () => {
  it('renders into document.body, not into the parent tree', () => {
    const { container } = render(<Harness />);

    // The portal is the whole reason this component can sit above an app whose own
    // layout creates a stacking context. A case asserting on `container` would pass
    // vacuously while the portal was broken, so assert BOTH sides.
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByText('Dashboard')).not.toBeNull();
  });

  it('renders nothing while the viewport is unmeasured', () => {
    // 0x0 is what `useWindowSize` reports on a server and for the first client
    // render. A window cannot be placed without a viewport and `createPortal` needs
    // a DOM node, so the component waits instead of guessing.
    setViewport(0, 0);
    render(<Harness />);

    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('renders nothing when closed', () => {
    render(
      <FloatingWindow open={false} onOpenChange={() => {}} title="Dashboard">
        <p>body content</p>
      </FloatingWindow>
    );

    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('body content')).toBeNull();
  });

  it('exposes the three controls with accessible names', () => {
    render(<Harness />);

    expect(screen.queryByRole('button', { name: 'Minimize' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Maximize' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeNull();
  });

  it('takes label overrides, which is what replaced the i18n dependency', () => {
    render(<Harness labels={{ close: 'Đóng', minimize: 'Thu nhỏ' }} />);

    expect(screen.queryByRole('button', { name: 'Đóng' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Thu nhỏ' })).not.toBeNull();
    // An unlisted label keeps its default rather than becoming `undefined`.
    expect(screen.queryByRole('button', { name: 'Maximize' })).not.toBeNull();
  });

  it('calls onOpenChange(false) from the close control', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow open onOpenChange={onOpenChange} title="Dashboard">
        <p>body content</p>
      </FloatingWindow>
    );

    act(() => {
      screen.getByRole('button', { name: 'Close' }).click();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('swaps Maximize for Restore once maximized', () => {
    render(<Harness />);

    act(() => {
      screen.getByRole('button', { name: 'Maximize' }).click();
    });

    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Maximize' })).toBeNull();
  });

  // The reason minimize animates a transform instead of unmounting: an iframe in
  // the body would otherwise reload and lose its state on every minimize.
  it('minimize keeps the body MOUNTED and shows the bubble', () => {
    render(<Harness />);

    act(() => {
      screen.getByRole('button', { name: 'Minimize' }).click();
    });

    expect(screen.queryByText('body content')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });

  it('takes the collapsed body out of hit-testing', () => {
    // An iframe's own `pointer-events: auto` beats a `none` on an ancestor, so the
    // invisible collapsed body would eat every click meant for the bubble.
    const { baseElement } = render(<Harness initialMode="minimized" />);

    const body = baseElement.querySelector('[data-inert]');
    expect(body?.getAttribute('data-inert')).toBe('true');
    expect(body?.textContent).toContain('body content');
  });

  it('is not inert while windowed and idle', () => {
    const { baseElement } = render(<Harness />);
    expect(baseElement.querySelector('[data-inert]')?.getAttribute('data-inert')).toBe('false');
  });

  it('puts data-mode on the root so the CSS can drive the collapse', () => {
    const { baseElement } = render(<Harness initialMode="minimized" />);
    expect(rootOf(baseElement)?.getAttribute('data-mode')).toBe('minimized');
  });

  it('writes geometry into --tnt-fw-* custom properties, not a JS animation', () => {
    // Motion lives in the stylesheet precisely so `prefers-reduced-motion` can
    // switch it off, which no media query can do to a JavaScript spring.
    const { baseElement } = render(
      <Harness geometry={{ x: 120, y: 80, width: 640, height: 480 }} />
    );

    const root = rootOf(baseElement);
    expect(root?.style.getPropertyValue('--tnt-fw-x')).toBe('120px');
    expect(root?.style.getPropertyValue('--tnt-fw-y')).toBe('80px');
    expect(root?.style.getPropertyValue('--tnt-fw-width')).toBe('640px');
    expect(root?.style.getPropertyValue('--tnt-fw-height')).toBe('480px');
  });

  it('collapses by scale, leaving width and height at the visible size', () => {
    const { baseElement } = render(
      <Harness initialMode="minimized" geometry={{ x: 0, y: 0, width: 480, height: 240 }} />
    );

    const root = rootOf(baseElement);
    // 48 / 480 and 48 / 240: the box keeps its layout size and only the transform
    // shrinks, which is what stops an iframe child from reflowing to 48px.
    expect(root?.style.getPropertyValue('--tnt-fw-width')).toBe('480px');
    expect(root?.style.getPropertyValue('--tnt-fw-scale-x')).toBe('0.1');
    expect(root?.style.getPropertyValue('--tnt-fw-scale-y')).toBe('0.2');
  });

  it('renders the focus shield only while inactive', () => {
    const shields = (baseElement: HTMLElement) => baseElement.querySelectorAll('[class*="shield"]');

    const { baseElement, rerender } = render(<Harness active={false} />);
    expect(shields(baseElement)).toHaveLength(1);

    rerender(<Harness active />);
    expect(shields(baseElement)).toHaveLength(0);
  });

  // Without an internal fallback the snap result went nowhere for a consumer who did
  // not wire `onBubblePositionChange`: `bubblePosition` never changed, so the bubble
  // jumped straight back to its default spot and could not be moved at all.
  it('remembers a dragged bubble even with no onBubblePositionChange', () => {
    const { baseElement } = render(<Harness initialMode="minimized" />);

    const bubble = screen.getByRole('button', { name: 'Dashboard' });
    const before = bubble.style.getPropertyValue('--tnt-fw-x');

    // Press, travel past the tap slop, release - a drag toward the left edge.
    act(() => {
      bubble.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 980, clientY: 400 })
      );
      bubble.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 300 })
      );
      bubble.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    const after = baseElement
      .querySelector<HTMLElement>('[class*="bubble"]')
      ?.style.getPropertyValue('--tnt-fw-x');

    // Snapped to the left edge, and it STAYED there.
    expect(after).not.toBe(before);
    expect(after).toBe('12px');
  });

  it('pulls a window back inside a viewport that shrank under it', async () => {
    const onGeometryChange = vi.fn();
    render(
      <Harness
        geometry={{ x: 900, y: 700, width: 900, height: 600 }}
        onGeometryChange={onGeometryChange}
      />
    );

    resize(600, 500);

    // `waitFor`, not a bare assertion: `useWindowSize` coalesces `resize` through
    // `requestAnimationFrame`, so the new size is not visible in the same tick the
    // event was dispatched. Asserting immediately read the OLD viewport and the case
    // passed on `124 + 900 = 1024` - the clamp against 1024x768, not against 600x500.
    await waitFor(() => {
      const fitted = onGeometryChange.mock.calls.at(-1)?.[0];
      expect(fitted.x + fitted.width).toBeLessThanOrEqual(600);
      expect(fitted.y).toBeLessThanOrEqual(500);
    });
  });
});

// "Bấm escape hay bất kỳ phím nào để thoát hay minimize" là PROPS SETTING, không phải
// hành vi mặc định: window này không phải modal, nên một Escape hardcode sẽ ném đi thứ
// người dùng đang làm trong đó, và không phím nào là lựa chọn đúng cho mọi ứng dụng.
describe('FloatingWindow - keyBindings', () => {
  it('binds NOTHING by default', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow open onOpenChange={onOpenChange} title="Dashboard">
        <p>body content</p>
      </FloatingWindow>
    );

    press('Escape');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Dashboard')).not.toBeNull();
  });

  it('closes on a bound key, and marks the event handled', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow
        open
        onOpenChange={onOpenChange}
        title="Dashboard"
        keyBindings={{ close: 'Escape' }}
      >
        <p>body content</p>
      </FloatingWindow>
    );

    const event = press('Escape');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // The caller asked for this key, so the host's own handling must not also run.
    expect(event.defaultPrevented).toBe(true);
  });

  it('parses modifiers through tinita/converter/parseKeyCombination', () => {
    render(<Harness keyBindings={{ minimize: 'Ctrl+M' }} />);

    // `event.key` is lower-case `m` while Ctrl is held; comparing exactly would never
    // match, which is why the matcher lower-cases both sides.
    press('m', { ctrlKey: true });
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });

  it('ignores the same key without its modifier', () => {
    render(<Harness keyBindings={{ minimize: 'Ctrl+M' }} />);

    press('m');
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull();
  });

  it('accepts several combinations for one action', () => {
    render(<Harness keyBindings={{ minimize: ['Ctrl+M', 'Cmd+M'] }} />);

    press('m', { metaKey: true });
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });

  it('toggles maximize, matching the header control', () => {
    render(<Harness keyBindings={{ maximize: 'F11' }} />);

    press('F11');
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeNull();
    press('F11');
    expect(screen.queryByRole('button', { name: 'Maximize' })).not.toBeNull();
  });

  // Binding a bare letter would otherwise fire on every occurrence of it in a field.
  it('ignores a bare printable key while the focus is in a text field', () => {
    const { baseElement } = render(
      <Harness keyBindings={{ minimize: 'm' }}>
        <input defaultValue="" />
      </Harness>
    );
    const input = baseElement.querySelector('input');

    press('m', {}, input as Element);
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull();

    // Away from the field it still works, so the guard is about the target and not
    // about the binding being broken.
    press('m');
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });

  it('still fires a named key inside a text field - Escape does not collide with typing', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow
        open
        onOpenChange={onOpenChange}
        title="Dashboard"
        keyBindings={{ close: 'Escape' }}
      >
        <input defaultValue="" />
      </FloatingWindow>
    );
    const input = document.querySelector('input');

    press('Escape', {}, input as Element);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('still fires a modified key inside a text field', () => {
    render(
      <Harness keyBindings={{ minimize: 'Ctrl+M' }}>
        <input defaultValue="" />
      </Harness>
    );
    const input = document.querySelector('input');

    press('m', { ctrlKey: true }, input as Element);
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });

  // With several windows open only the one the reader is working in should answer.
  it('answers no key while inactive', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow
        open
        active={false}
        onOpenChange={onOpenChange}
        title="Dashboard"
        keyBindings={{ close: 'Escape' }}
      >
        <p>body content</p>
      </FloatingWindow>
    );

    press('Escape');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('answers no key while closed', () => {
    const onOpenChange = vi.fn();
    render(
      <FloatingWindow
        open={false}
        onOpenChange={onOpenChange}
        title="Dashboard"
        keyBindings={{ close: 'Escape' }}
      >
        <p>body content</p>
      </FloatingWindow>
    );

    press('Escape');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount', () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <FloatingWindow
        open
        onOpenChange={onOpenChange}
        title="Dashboard"
        keyBindings={{ close: 'Escape' }}
      >
        <p>body content</p>
      </FloatingWindow>
    );

    unmount();
    press('Escape');
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

// Hover vào icon phải hiện luôn phím tắt, và trên Mac là glyph của Apple.
describe('FloatingWindow - the controls advertise their shortcut', () => {
  const titleOf = (name: string) => screen.getByRole('button', { name }).getAttribute('title');
  const shortcutsOf = (name: string) =>
    screen.getByRole('button', { name }).getAttribute('aria-keyshortcuts');

  it('shows nothing extra when nothing is bound', () => {
    render(<Harness />);

    expect(titleOf('Minimize')).toBe('Minimize');
    expect(shortcutsOf('Minimize')).toBeNull();
  });

  it('appends the combination to the hover text', () => {
    render(<Harness keyBindings={{ minimize: 'Ctrl+M', close: 'Escape', maximize: 'F11' }} />);

    expect(titleOf('Minimize')).toBe('Minimize (Ctrl + M)');
    expect(titleOf('Close')).toBe('Close (Escape)');
    expect(titleOf('Maximize')).toBe('Maximize (F11)');
  });

  it('keeps aria-label the plain action name, with the key in aria-keyshortcuts', () => {
    // ARIA defines an attribute for this. Folding the shortcut into the label would
    // make a screen reader that supports the attribute announce it twice.
    render(<Harness keyBindings={{ minimize: ['Ctrl+M', 'Cmd+M'] }} />);

    const button = screen.getByRole('button', { name: 'Minimize' });
    expect(button.getAttribute('aria-label')).toBe('Minimize');
    // Both alternatives, because both fire.
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Control+M Meta+M');
  });

  it('follows the label when maximize becomes restore', () => {
    render(<Harness keyBindings={{ maximize: 'F11' }} />);

    act(() => {
      screen.getByRole('button', { name: 'Maximize' }).click();
    });
    expect(titleOf('Restore')).toBe('Restore (F11)');
  });

  it('shows the Apple glyph on an Apple user-agent', () => {
    const agent = vi
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    try {
      render(<Harness keyBindings={{ minimize: ['Ctrl+M', 'Cmd+M'] }} />);
      expect(titleOf('Minimize')).toBe('Minimize (⌘ + M)');
    } finally {
      agent.mockRestore();
    }
  });

  // The case that keeps the hint honest: with only Control bound, Control is what
  // fires on a Mac too, so the label must say so instead of showing ⌘.
  it('does not promise ⌘ on Apple when only Ctrl was bound', () => {
    const agent = vi
      .spyOn(navigator, 'userAgent', 'get')
      .mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    try {
      render(<Harness keyBindings={{ minimize: 'Ctrl+M' }} />);
      expect(titleOf('Minimize')).toBe('Minimize (⌃ + M)');
    } finally {
      agent.mockRestore();
    }
  });

  // One parse feeds both the listener and the label, so they cannot disagree.
  it('advertises exactly the key that works', () => {
    render(<Harness keyBindings={{ minimize: 'Ctrl+M' }} />);
    expect(titleOf('Minimize')).toBe('Minimize (Ctrl + M)');

    press('m', { ctrlKey: true });
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeNull();
  });
});
