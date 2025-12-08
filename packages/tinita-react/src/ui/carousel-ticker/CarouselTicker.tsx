import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import {
  calculateLayout,
  initializeOrUpdateAnimation,
  setupIntersectionObserver,
  setupResizeObserver,
  setupHoverListeners,
} from './CarouselTicker.utils';
import type {
  CarouselTickerProps,
  CarouselLayoutState,
  CarouselMeasurementContext,
  CarouselAnimationConfig,
  CarouselEventConfig,
} from './CarouselTicker.types';
import './CarouselTicker.css';

/**
 * CarouselTicker - Infinite scrolling carousel component
 *
 * Creates an infinite loop of content by cloning children to fill the viewport
 * and using Web Animations API for continuous translation.
 *
 * @example
 * ```tsx
 * <CarouselTicker direction="left" speedMs={8000}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </CarouselTicker>
 * ```
 */
export const CarouselTicker: React.FC<CarouselTickerProps> = ({
  children,
  delayMs = 0,
  direction = 'left',
  overflowVisible = false,
  overflowBufferPx = 0,
  pauseOnHover = false,
  speedMs = 10_000,
  trigger = 'on-load',
  className,
  contentClassName,
  fade = false,
  fadeColor = '#fff',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const patternRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [layoutState, setLayoutState] = useState<CarouselLayoutState>({
    stridePx: 0,
    leadingRepeatCount: 0,
    totalRepeatCount: 1,
  });

  const isVertical = direction === 'top' || direction === 'bottom';
  const isReverseDirection = direction === 'right' || direction === 'bottom';

  const baseChildrenArray = useMemo(() => React.Children.toArray(children), [children]);

  // Create measurement context for utility functions
  const measurementContext: CarouselMeasurementContext = useMemo(
    () => ({
      patternRef,
      containerRef,
      isVertical,
    }),
    [isVertical]
  );

  /**
   * Recalculates layout and updates state.
   * Called when direction, overflow buffer, or children change.
   */
  const handleLayoutRecalculation = () => {
    const newLayout = calculateLayout(measurementContext, overflowBufferPx);
    if (newLayout) {
      setLayoutState(newLayout);
    }
  };

  /**
   * Step 1: After initial render, measure stride and viewport to calculate layout.
   * Uses useLayoutEffect to prevent flicker.
   */
  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Wait one frame to ensure DOM is fully laid out, especially important for vertical
    const timeoutId = setTimeout(() => {
      handleLayoutRecalculation();
      setupResizeObserver({
        containerRef,
        trigger,
        isVertical,
        animationRef,
        intersectionObserverRef,
        onResize: handleLayoutRecalculation,
        resizeObserverRef,
      });
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, overflowBufferPx, baseChildrenArray.length, isVertical]);

  /**
   * Step 2: When layoutState or main config changes, update animation.
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!layoutState.stridePx) {
      return;
    }

    const animationConfig: CarouselAnimationConfig = {
      contentRef,
      layoutState,
      delayMs,
      speedMs,
      isVertical,
      isReverseDirection,
      trigger,
      animationRef,
    };

    initializeOrUpdateAnimation(animationConfig);

    if (trigger === 'on-load') {
      animationRef.current?.play();
    } else if (trigger === 'in-view') {
      setupIntersectionObserver({
        containerRef,
        trigger,
        isVertical,
        animationRef,
        intersectionObserverRef,
        onResize: handleLayoutRecalculation,
        resizeObserverRef,
      });
    }

    return () => {
      animationRef.current?.cancel();
      animationRef.current = null;
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
        intersectionObserverRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    layoutState.stridePx,
    layoutState.leadingRepeatCount,
    layoutState.totalRepeatCount,
    delayMs,
    speedMs,
    trigger,
    direction,
  ]);

  /**
   * Step 3: Setup hover listeners if needed.
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const eventConfig: CarouselEventConfig = {
      containerRef,
      pauseOnHover,
      animationRef,
    };

    const cleanup = setupHoverListeners(eventConfig);
    return cleanup;
  }, [pauseOnHover]);

  /**
   * Renders repeated patterns of children to create seamless infinite loop.
   * Each pattern is a complete group of all children.
   * Children are rendered directly in the pattern wrapper to preserve className and styling.
   */
  const renderRepeatedPatterns = (): React.ReactNode[] | null => {
    if (baseChildrenArray.length === 0) {
      return null;
    }

    const patterns: React.ReactNode[] = [];

    for (let index = 0; index < layoutState.totalRepeatCount; index += 1) {
      const isReferencePattern = index === layoutState.leadingRepeatCount;

      patterns.push(
        <div
          key={`pattern-${index}`}
          ref={isReferencePattern ? patternRef : undefined}
          className={cn(
            'tinita-carousel-ticker__pattern shrink-0 grow-0 flex will-change-transform',
            isVertical ? 'flex-col' : 'flex-row'
          )}
          style={{ ...(isVertical ? { width: '100%' } : { height: '100%' }) }}
          aria-hidden={index !== layoutState.leadingRepeatCount}
        >
          {baseChildrenArray.map((child, childIndex) => {
            // Clone child with unique key and merge style to preserve className
            if (React.isValidElement(child)) {
              const childProps = child.props as {
                style?: React.CSSProperties;
                className?: string;
              };
              return React.cloneElement(child, {
                key: `pattern-${index}-item-${childIndex}`,
                className: cn(
                  'shrink-0 grow-0 will-change-transform',
                  childProps?.className
                ),
                style: { ...(childProps?.style || {}) },
              } as Record<string, unknown>);
            }
            // Fallback for non-element children
            return (
              <div
                key={`pattern-${index}-item-${childIndex}`}
                className="shrink-0 grow-0 will-change-transform"
              >
                {child}
              </div>
            );
          })}
        </div>
      );
    }

    return patterns;
  };

  /**
   * Renders fade overlay based on direction.
   * Uses horizontal fade for left/right directions and vertical fade for top/bottom directions.
   */
  const renderFadeOverlay = (): React.ReactNode => {
    if (!fade) {
      return null;
    }

    // Dynamic backgroundImage and zIndex must be inline
    const fadeStyle: React.CSSProperties = {
      zIndex: 2,
      backgroundImage: isVertical
        ? `linear-gradient(${fadeColor}, ${fadeColor}00 20%, ${fadeColor}00 80%, ${fadeColor})`
        : `linear-gradient(90deg, ${fadeColor}, ${fadeColor}00 20%, ${fadeColor}00 80%, ${fadeColor})`,
    };

    return (
      <div
        className="tinita-carousel-ticker__fade absolute inset-0 pointer-events-none"
        style={fadeStyle}
        aria-hidden="true"
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'tinita-carousel-ticker',
        'relative',
        overflowVisible ? 'overflow-visible' : 'overflow-hidden',
        isVertical && 'h-full min-h-[100px]',
        className
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          'tinita-carousel-ticker__content m-0 p-0 relative flex w-full overflow-visible will-change-transform',
          isVertical ? 'flex-col h-auto min-h-full' : 'flex-row h-full min-h-auto',
          contentClassName
        )}
      >
        {renderRepeatedPatterns()}
      </div>
      {renderFadeOverlay()}
    </div>
  );
};
