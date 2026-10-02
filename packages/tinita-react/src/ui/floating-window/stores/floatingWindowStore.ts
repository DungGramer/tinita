import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComponentType } from 'react';

export type WindowId = string; // 'airflow' | 'metabase' today

export interface WindowMeta {
  url: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string; // brand tint for currentColor icons (e.g. 'text-violet-500')
}

export interface FloatingWindow {
  isOpen?: boolean; // optional: stripped from persisted state, so undefined after rehydration
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;     // stacking; bumped on focus
  bubbleX?: number;  // last snapped minimized-bubble position (persisted); undefined → hook default
  bubbleY?: number;
  meta?: WindowMeta; // runtime-only (NOT persisted)
}

// Persisted subset — geometry + flags + bubble position only.
type PersistedWindow = Pick<
  FloatingWindow,
  'x' | 'y' | 'width' | 'height' | 'isMinimized' | 'isMaximized' | 'order' | 'bubbleX' | 'bubbleY'
>;

interface FloatingWindowState {
  windows: Record<WindowId, FloatingWindow>;
  focusCounter: number;
  open: (id: WindowId, meta: WindowMeta) => void;
  close: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  restore: (id: WindowId) => void;      // unminimize
  toggleMaximize: (id: WindowId) => void;
  focus: (id: WindowId) => void;        // bring to front
  setPosition: (id: WindowId, x: number, y: number) => void;
  setSize: (id: WindowId, width: number, height: number) => void;
  setBubblePosition: (id: WindowId, x: number, y: number) => void; // remember minimized-bubble spot
}

// Default: opens FULLSCREEN (isMaximized:true). Windowed geometry below is the
// RESTORE TARGET (900×600 clamped, centered) used when the user restores.
function seed(order: number): FloatingWindow {
  const width = Math.min(900, window.innerWidth - 80);
  const height = Math.min(600, window.innerHeight - 120);
  return {
    isOpen: false, isMinimized: false, isMaximized: true, // fullscreen by default
    x: Math.max(24, (window.innerWidth - width) / 2),
    y: Math.max(24, (window.innerHeight - height) / 2 - 20),
    width, height, order,
  };
}

export const useFloatingWindowStore = create<FloatingWindowState>()(
  persist(
    (set) => ({
      windows: {},
      focusCounter: 1,
      open: (id, meta) => set((s) => {
        const order = s.focusCounter + 1;
        const prev = s.windows[id] ?? seed(order);
        return {
          focusCounter: order,
          windows: { ...s.windows, [id]: { ...prev, meta, isOpen: true, isMinimized: false, order } },
        };
      }),
      close: (id) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], isOpen: false } } } : s),
      minimize: (id) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], isMinimized: true } } } : s),
      restore: (id) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], isMinimized: false } } } : s),
      toggleMaximize: (id) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], isMaximized: !s.windows[id].isMaximized } } } : s),
      focus: (id) => set((s) => {
        if (!s.windows[id]) return s;
        const order = s.focusCounter + 1;
        return { focusCounter: order, windows: { ...s.windows, [id]: { ...s.windows[id], order } } };
      }),
      setPosition: (id, x, y) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], x, y } } } : s),
      setSize: (id, width, height) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], width, height } } } : s),
      setBubblePosition: (id, x, y) => set((s) => s.windows[id]
        ? { windows: { ...s.windows, [id]: { ...s.windows[id], bubbleX: x, bubbleY: y } } } : s),
    }),
    {
      name: 'vizone:floating-windows',
      // Persist geometry + flags per window; strip isOpen + meta (runtime-only).
      partialize: (s) => ({
        windows: Object.fromEntries(
          Object.entries(s.windows).map(([id, w]) => [id, {
            x: w.x, y: w.y, width: w.width, height: w.height,
            isMinimized: w.isMinimized, isMaximized: w.isMaximized, order: w.order,
            bubbleX: w.bubbleX, bubbleY: w.bubbleY,
          } satisfies PersistedWindow]),
        ),
      }),
    }
  )
);
