import type { ReactNode } from 'react';

export type CarouselDirection = 'left' | 'right' | 'top' | 'bottom';
export type CarouselTrigger = 'on-load' | 'in-view';

export interface CarouselTickerProps {
  children: ReactNode;
  delayMs?: number;
  direction?: CarouselDirection;
  overflowVisible?: boolean;
  overflowBufferPx?: number;
  pauseOnHover?: boolean;
  speedMs?: number;
  trigger?: CarouselTrigger;
  className?: string;
  contentClassName?: string;
  /**
   * Enable fade effect on edges.
   * Automatically uses horizontal fade for left/right directions
   * and vertical fade for top/bottom directions.
   * @default false
   */
  fade?: boolean;
  /**
   * Custom fade color (default: white #fff).
   * Can be any valid CSS color value.
   * @default '#fff'
   */
  fadeColor?: string;
}

export interface CarouselLayoutState {
  stridePx: number;
  leadingRepeatCount: number;
  totalRepeatCount: number;
}

export interface CarouselMeasurementContext {
  patternRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isVertical: boolean;
}

export interface CarouselAnimationConfig {
  contentRef: React.RefObject<HTMLDivElement | null>;
  layoutState: CarouselLayoutState;
  delayMs: number;
  speedMs: number;
  isVertical: boolean;
  isReverseDirection: boolean;
  trigger: CarouselTrigger;
  animationRef: React.RefObject<Animation | null>;
}

export interface CarouselObserverConfig {
  containerRef: React.RefObject<HTMLDivElement | null>;
  trigger: CarouselTrigger;
  isVertical: boolean;
  animationRef: React.RefObject<Animation | null>;
  intersectionObserverRef: React.RefObject<IntersectionObserver | null>;
  onResize: () => void;
  resizeObserverRef: React.RefObject<ResizeObserver | null>;
}

export interface CarouselEventConfig {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pauseOnHover: boolean;
  animationRef: React.RefObject<Animation | null>;
}
