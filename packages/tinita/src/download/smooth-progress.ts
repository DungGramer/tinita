/**
 * A stateful speed smoother that applies exponential moving average (EMA)
 * to a series of raw speed samples.
 */
export interface SpeedSmoother {
  /**
   * Feed a new raw speed sample (in bytes per second) and receive the
   * current smoothed value.
   *
   * The first call stores the raw value directly (no smoothing) to avoid
   * starting from an artificially low baseline.
   *
   * @param rawSpeedBps - Instantaneous speed sample in bytes/second.
   * @returns Smoothed speed in bytes/second.
   */
  update(rawSpeedBps: number): number;

  /**
   * Return the most recent smoothed speed without consuming a new sample.
   *
   * @returns Smoothed speed in bytes/second, or `null` if no samples have
   *   been fed yet.
   */
  current(): number | null;

  /**
   * Reset the smoother to its initial state (discards all history).
   * The next call to {@link update} will be treated as the first sample again.
   */
  reset(): void;
}

/**
 * Create a speed smoother using an exponential moving average (EMA).
 *
 * Formula: `smoothed = alpha * raw + (1 - alpha) * prevSmoothed`
 *
 * A lower `alpha` produces a smoother (less reactive) value; a higher `alpha`
 * tracks the raw signal more closely.
 *
 * @param alpha - Smoothing factor in the range `(0, 1]`. @default 0.3
 * @returns A {@link SpeedSmoother} instance.
 *
 * @example
 * const smoother = createSpeedSmoother();
 * smoother.update(1_000_000); // => 1_000_000  (first sample, no smoothing)
 * smoother.update(2_000_000); // => 1_300_000  (0.3 * 2e6 + 0.7 * 1e6)
 * smoother.current();         // => 1_300_000
 * smoother.reset();
 * smoother.current();         // => null
 *
 * @example
 * // Use a lower alpha for a very smooth display value
 * const smoother = createSpeedSmoother(0.1);
 */
export function createSpeedSmoother(alpha = 0.3): SpeedSmoother {
  let smoothed: number | null = null;

  return {
    update(rawSpeedBps: number): number {
      if (smoothed === null) {
        // First sample: use raw value directly.
        smoothed = rawSpeedBps;
      } else {
        smoothed = alpha * rawSpeedBps + (1 - alpha) * smoothed;
      }
      return smoothed;
    },

    current(): number | null {
      return smoothed;
    },

    reset(): void {
      smoothed = null;
    },
  };
}
