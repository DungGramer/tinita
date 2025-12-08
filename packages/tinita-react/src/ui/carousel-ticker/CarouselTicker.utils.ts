import type {
  CarouselLayoutState,
  CarouselMeasurementContext,
  CarouselAnimationConfig,
  CarouselObserverConfig,
  CarouselEventConfig,
} from './CarouselTicker.types';

/**
 * Measures the stride (length of one complete pattern) in pixels.
 * The stride is the total width (horizontal) or height (vertical) of all children combined.
 */
export function measureStrideInPixels(
  context: CarouselMeasurementContext
): number {
  const { patternRef, isVertical } = context;

  if (!patternRef.current) {
    return 0;
  }

  const patternRect = patternRef.current.getBoundingClientRect();
  return isVertical ? patternRect.height : patternRect.width;
}

/**
 * Measures the viewport size of the container along the scroll axis.
 */
export function measureViewportSizeInPixels(
  context: CarouselMeasurementContext
): number {
  const { containerRef, isVertical } = context;

  if (!containerRef.current) {
    return 0;
  }

  const containerRect = containerRef.current.getBoundingClientRect();
  return isVertical ? containerRect.height : containerRect.width;
}

/**
 * Calculates the layout state including stride, leading repeat count, and total repeat count.
 * This ensures seamless infinite looping by rendering enough patterns off-screen.
 */
export function calculateLayout(
  context: CarouselMeasurementContext,
  overflowBufferPx: number
): CarouselLayoutState | null {
  const stridePx = measureStrideInPixels(context);
  const viewportSizePx = measureViewportSizeInPixels(context);

  if (!stridePx || !viewportSizePx) {
    return null;
  }

  // Calculate leading buffer patterns based on overflow size
  const leadingRepeatCount =
    overflowBufferPx > 0 ? Math.ceil(overflowBufferPx / stridePx) : 0;

  // Calculate visible patterns needed to fill viewport
  const visibleRepeatCount = Math.ceil(viewportSizePx / stridePx);

  // Add extra patterns to ensure seamless loop when animation resets
  // For long content (large stride), we need fewer extra patterns
  // For short content (small stride), we need more extra patterns
  const extraPatterns = stridePx < viewportSizePx ? 3 : 2;

  // Total repeat count = leading buffer + visible + extra patterns for seamless loop
  // Minimum: buffer + 3 patterns (1 visible + 2 extra)
  const totalRepeatCount = Math.max(
    leadingRepeatCount + visibleRepeatCount + extraPatterns,
    leadingRepeatCount + 3
  );

  return {
    stridePx,
    leadingRepeatCount,
    totalRepeatCount,
  };
}

/**
 * Initializes or updates the Web Animations API animation.
 * Creates a seamless infinite loop by animating from one pattern offset to the next.
 */
export function initializeOrUpdateAnimation(
  config: CarouselAnimationConfig
): void {
  const {
    contentRef,
    layoutState,
    delayMs,
    speedMs,
    isVertical,
    isReverseDirection,
    trigger,
    animationRef,
  } = config;

  if (!contentRef.current || !layoutState.stridePx) {
    return;
  }

  const contentElement = contentRef.current;

  // Cancel existing animation if present
  if (animationRef.current) {
    animationRef.current.cancel();
    animationRef.current = null;
  }

  // Calculate start and end offsets based on leadingRepeatCount for off-screen buffer
  const startOffset = -layoutState.leadingRepeatCount * layoutState.stridePx;
  const endOffset = -(layoutState.leadingRepeatCount + 1) * layoutState.stridePx;

  const axis = isVertical ? 'Y' : 'X';
  const keyframes: Keyframe[] = [
    {
      transform: `translate${axis}(${startOffset}px)`,
    },
    {
      transform: `translate${axis}(${endOffset}px)`,
    },
  ];

  const animation = contentElement.animate(keyframes, {
    delay: delayMs,
    duration: speedMs,
    iterations: Infinity,
    easing: 'linear',
    direction: isReverseDirection ? 'reverse' : 'normal',
    fill: 'forwards',
  });

  // If trigger is in-view, pause until observer activates
  if (trigger === 'in-view') {
    animation.pause();
  }

  animationRef.current = animation;
}

/**
 * Sets up IntersectionObserver for 'in-view' trigger mode.
 * Starts animation when the container enters the viewport.
 */
export function setupIntersectionObserver(
  config: CarouselObserverConfig
): void {
  const {
    containerRef,
    trigger,
    isVertical,
    animationRef,
    intersectionObserverRef,
  } = config;

  if (!containerRef.current || trigger !== 'in-view') {
    return;
  }

  // Fallback: if IntersectionObserver is not available, play immediately
  if (!('IntersectionObserver' in window)) {
    animationRef.current?.play();
    return;
  }

  // Clean up existing observer
  if (intersectionObserverRef.current) {
    intersectionObserverRef.current.disconnect();
    intersectionObserverRef.current = null;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animationRef.current?.play();
          observer.disconnect();
          intersectionObserverRef.current = null;
          break;
        }
      }
    },
    {
      threshold: isVertical ? 0.5 : 1,
    }
  );

  observer.observe(containerRef.current);
  intersectionObserverRef.current = observer;
}

/**
 * Sets up ResizeObserver to react to container size changes.
 * Recalculates layout when the container is resized.
 */
export function setupResizeObserver(config: CarouselObserverConfig): void {
  const { containerRef, onResize, resizeObserverRef } = config;

  if (!containerRef.current) {
    return;
  }

  if (!('ResizeObserver' in window)) {
    return;
  }

  // Clean up existing observer
  if (resizeObserverRef.current) {
    resizeObserverRef.current.disconnect();
    resizeObserverRef.current = null;
  }

  const observer = new ResizeObserver(() => {
    // Recalculate layout when container size changes
    // Animation will be updated by effect that depends on layoutState
    onResize();
  });

  observer.observe(containerRef.current);
  resizeObserverRef.current = observer;
}

/**
 * Sets up hover and touch event listeners to pause/resume animation.
 * Returns a cleanup function to remove event listeners.
 */
export function setupHoverListeners(
  config: CarouselEventConfig
): (() => void) | undefined {
  const { containerRef, pauseOnHover, animationRef } = config;

  const containerElement = containerRef.current;
  if (!containerElement || !pauseOnHover) {
    return undefined;
  }

  const handlePause = () => {
    animationRef.current?.pause();
  };

  const handlePlay = () => {
    animationRef.current?.play();
  };

  containerElement.addEventListener('mouseenter', handlePause, {
    passive: true,
  });
  containerElement.addEventListener('mouseleave', handlePlay, {
    passive: true,
  });
  containerElement.addEventListener('touchstart', handlePause, {
    passive: true,
  });
  containerElement.addEventListener('touchend', handlePlay, {
    passive: true,
  });
  containerElement.addEventListener('touchcancel', handlePlay, {
    passive: true,
  });

  return () => {
    containerElement.removeEventListener('mouseenter', handlePause);
    containerElement.removeEventListener('mouseleave', handlePlay);
    containerElement.removeEventListener('touchstart', handlePause);
    containerElement.removeEventListener('touchend', handlePlay);
    containerElement.removeEventListener('touchcancel', handlePlay);
  };
}
