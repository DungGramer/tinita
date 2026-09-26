/**
 * Tells a stepped mouse wheel apart from an input that has already been
 * smoothed before it reached the page.
 *
 * WHY THIS IS A CLASSIFIER AND NOT A FEATURE DETECT: nothing exposes whether
 * Mos, SmoothScroll or Mac Mouse Fix is installed. There is no API, no UA hint,
 * no permission to ask for. What those apps DO leak is the shape of the event
 * stream they synthesise, and that is a thing the page can measure. So this
 * module answers "is what I am receiving already smooth", which is also the
 * question that actually matters — a trackpad gives the same answer for the same
 * reason, and double-smoothing a trackpad is exactly as wrong as
 * double-smoothing Mos.
 *
 * The two shapes:
 *
 *   stepped   one event per detent, ~100-133px in Chrome or a whole number of
 *             lines elsewhere, tens of milliseconds apart, the SAME magnitude
 *             every time because a detent is a detent.
 *
 *   smoothed  a stream generated per display frame: small magnitudes that ramp
 *             up and decay, arriving at 60-120Hz, essentially never twice the
 *             same number.
 *
 * Everything here is a heuristic over those two shapes. The thresholds are named
 * so they can be argued with.
 */

/** Events needed before the classifier will commit to an answer. */
export const WHEEL_SAMPLE_COUNT = 8;

/**
 * Median gap at or below which the stream counts as continuous (~42Hz). A hand
 * spinning a wheel hard still leaves bigger gaps than a frame-clocked generator;
 * this is deliberately below 60Hz's 16.7ms plus room for a slow frame.
 */
export const WHEEL_CONTINUOUS_GAP_MS = 24;

/**
 * Median magnitude above which the source is a detent regardless of how fast the
 * events arrive. Chrome reports 100px per notch on Windows and 133.33px with
 * some drivers; a per-frame smoother is an order of magnitude below that.
 */
export const WHEEL_STEP_MIN_PIXELS = 48;

/**
 * Share of samples that must carry the exact same magnitude to call the source
 * stepped on repetition alone. EXACT equality is the point: a ramp built per
 * frame lands on fractional, always-changing numbers, so this can only fire on a
 * generator that emits one fixed quantum.
 *
 * This rule carries the case the other two cannot see: a wheel whose detent is
 * SMALL (a fine encoder, or line-mode scaled down) and spun fast enough to look
 * continuous. Density and magnitude both say "smoothed" there; repetition is the
 * only thing left that says otherwise.
 *
 * 6-of-8 rather than a bare majority, AND a floor on the magnitude - see
 * `WHEEL_REPEAT_MIN_PIXELS`, which is the half of the rule that was missing.
 */
export const WHEEL_REPEAT_SHARE = 0.75;

/**
 * Smallest quantum the repetition rule will call a detent.
 *
 * THE RULE FIRED ON THE TAIL OF EVERY TRACKPAD FLICK. macOS momentum decays to
 * a long run of whole-pixel events - 2, 2, 1, 1, 1, 1, 1, 1 - which is exact
 * repetition at share 1.0, so eight samples of a decelerating trackpad
 * classified as `stepped` and stayed that way in the buffer. That verdict is
 * what greeted the NEXT gesture, and the jerks the reader felt at the start of
 * a scroll were this rule's answer being handed to `installSmoothScroll`.
 *
 * The earlier comment called that risk a guess and left the rule ungated
 * because a 48px gate made it unreachable (anything that big is already caught
 * by `fineGrained`). 48px was the wrong number to try: the rule exists for a
 * SMALL detent, so the floor belongs just above the noise it was firing on
 * rather than up at a full notch. No wheel has an 8px detent worth smoothing;
 * no momentum tail exceeds it.
 */
export const WHEEL_REPEAT_MIN_PIXELS = 8;

/**
 * Silence at or above which the next wheel event begins a NEW gesture.
 *
 * A gesture is frame-clocked - `WHEEL_CONTINUOUS_GAP_MS` puts even a slow one
 * under 24ms - so this only has to sit above a dropped frame or two, and far
 * enough below a human pause that two flicks never merge into one. The samples
 * either side of such a gap describe two different hand movements and must not
 * be classified together.
 */
export const WHEEL_GESTURE_IDLE_MS = 120;

export type WheelSource = 'stepped' | 'smoothed';

/** One wheel event, already converted to pixels by the caller. */
export interface WheelSample {
  /** `event.timeStamp`, milliseconds. */
  time: number;
  /** Pixel delta along the axis being scrolled. Sign is ignored. */
  delta: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Largest share any single value holds in the list. */
function topShare(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

/**
 * Classifies the tail of a wheel stream.
 *
 * @returns `null` when there is not enough evidence yet — the caller keeps
 *          whatever it was already doing rather than flip-flopping on two events.
 */
export function classifyWheelSource(samples: WheelSample[]): WheelSource | null {
  if (samples.length < WHEEL_SAMPLE_COUNT) return null;

  const recent = samples.slice(-WHEEL_SAMPLE_COUNT);
  const magnitudes = recent.map((s) => Math.abs(s.delta));
  const gaps = recent.slice(1).map((s, i) => s.time - recent[i].time);

  // A fixed quantum repeated verbatim is a detent - PROVIDED the quantum is big
  // enough to be one. Ungated, this rule read the whole-pixel tail of every
  // macOS momentum scroll as a detent; see `WHEEL_REPEAT_MIN_PIXELS`.
  if (topShare(magnitudes) >= WHEEL_REPEAT_SHARE && median(magnitudes) >= WHEEL_REPEAT_MIN_PIXELS) {
    return 'stepped';
  }

  const continuous = median(gaps) <= WHEEL_CONTINUOUS_GAP_MS;
  const fineGrained = median(magnitudes) < WHEEL_STEP_MIN_PIXELS;
  return continuous && fineGrained ? 'smoothed' : 'stepped';
}

/**
 * What ONE event settles on its own, or `null` when it settles nothing.
 *
 * Timing needs a history; size does not. A 100px event is a detent whatever
 * came before it, and a 3px event is not one whatever came before it. Between
 * those two floors sits a real ambiguity - a fine encoder's detent and a
 * trackpad mid-ramp are the same size - and the honest answer there is that a
 * single event does not know.
 *
 * The caller uses this to decide whether a remembered verdict still applies to
 * the gesture starting now. A reader who puts the mouse down and picks up the
 * trackpad contradicts that memory in one event, and this is what sees it.
 */
export function decisiveWheelSource(delta: number): WheelSource | null {
  const size = Math.abs(delta);
  if (size >= WHEEL_STEP_MIN_PIXELS) return 'stepped';
  if (size < WHEEL_REPEAT_MIN_PIXELS) return 'smoothed';
  return null;
}

/**
 * The verdict to use for the first few events of a gesture, before
 * `classifyWheelSource` will commit to one, and with nothing remembered to fall
 * back on. Guesses `smoothed` through the ambiguous band: easing an input that
 * was already smooth is the failure a reader feels, and passing a detent
 * through unsmoothed for a few events is the one they do not.
 */
export function provisionalWheelSource(delta: number): WheelSource {
  return decisiveWheelSource(delta) ?? 'smoothed';
}
