import {
  classifyWheelSource,
  decisiveWheelSource,
  provisionalWheelSource,
  WHEEL_GESTURE_IDLE_MS,
  WHEEL_SAMPLE_COUNT,
  type WheelSample,
  type WheelSource,
} from './wheel-source';

/**
 * One delegated wheel listener for the whole app, so a scroller does not have to
 * ask for smoothing — 26 elements in `src/` carry an `overflow-*-auto` class
 * today and every one of them is covered by installing this once.
 *
 * Two behaviours, and they are separate things:
 *
 *   1. A detent-stepped wheel is EASED, on whichever element the browser would
 *      have scrolled anyway. Nothing else changes: same element, same distance,
 *      same end position.
 *   2. A vertical wheel over an element that can only scroll SIDEWAYS scrolls it
 *      sideways. Browsers do not do this — measured on this app's filmstrip,
 *      where a plain wheel moved nothing at all — and Shift+wheel is an answer
 *      most people never think to ask for.
 *
 * Input that is already smooth (Mos, SmoothScroll, Mac Mouse Fix, or a
 * trackpad) is left to the browser entirely in case 1, because a second easing
 * layered on the first is what makes those feel like the page lags behind the
 * hand. See `./wheel-source` for why that is a measurement of the event stream
 * rather than a check for an installed app, which nothing exposes. Case 2 still
 * has to act, since the browser would scroll the wrong element, but it applies
 * the delta raw rather than easing it.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH:
 *   - Anything an inner handler already claimed, tested with `defaultPrevented`.
 *     That is why the listener is on `document` in the BUBBLE phase and not in
 *     capture: the region editor's wheel-to-zoom (RegionConfigModal.tsx:425) and
 *     mapbox's scroll-zoom both sit on inner elements and both preventDefault,
 *     so both run first and this steps aside. Capture would have overridden them.
 *   - Ctrl+wheel, which is the browser's zoom.
 *   - A wheel that already carries `deltaX` — a trackpad swiping sideways is
 *     scrolling sideways already, and moving it again would double the distance.
 *   - Any subtree marked `data-no-smooth-scroll`, the explicit opt-out.
 *   - Readers who asked their machine for reduced motion.
 */

// A wheel event does not have to arrive in pixels. `deltaMode` says which unit
// the deltas are counted in; LINE would move three pixels per notch if the
// number were used raw. PAGE is converted against the element being scrolled.
const WHEEL_DELTA_MODE_LINE = 1;
const WHEEL_DELTA_MODE_PAGE = 2;
const WHEEL_LINE_HEIGHT_PX = 16;

// Rate of the critically damped spring that carries the scroll to its target,
// per second. Settling takes about 6/rate, so 20 lands on ~300ms.
//
// A SPRING and not the exponential decay this started as. Decay's flaw is that
// its velocity is highest at t=0: the motion snaps into existence from rest,
// measured at 16px on the very first frame of a 100px notch and 49px of a 300px
// one, which is the jolt at the start of every gesture. A critically damped
// spring starts at zero velocity, accelerates, then decelerates — and because it
// carries velocity as state, a second notch mid-flight blends into the motion
// already happening instead of restarting a curve.
const SPRING_RATE_PER_SECOND = 20;

// The smallest movement a frame is allowed to render while there is still ground
// to cover, and equally the point at which the animation is finished: less than
// one pixel of travel left is nothing a screen can show, so the last fraction is
// written out in one go rather than spread over frames that each paint the same
// offset. Ending at half a pixel instead left `99, 99, 100, 100` on the end of
// every gesture — two frames of nothing, which is the stutter this whole
// constant exists to remove.
//
// Scroll offsets are integers — assigning 10.4 and reading it back returns 10 —
// so once the spring's per-frame step falls under a pixel, frame after frame
// paints the SAME position. Measured on the decay this replaces: 9 of 31 frames
// moved nothing, and a 100px notch ended `98, 98, 99, 99, 99, 99, 99, 99, 100`.
// Six identical frames in a row is not a slow finish, it is a stutter. Forcing a
// whole pixel means every frame is visible progress, and it also guarantees the
// loop terminates rather than crawling at a hundredth of a pixel.
//
// THE ONE PLACE REFRESH RATE LEAKS IN, stated because the rest of this file goes
// to some trouble to keep it out: a pixel per FRAME is not a pixel per unit
// time, so the tail is covered twice as fast on a 120Hz screen. Measured on a
// 100px notch: 320ms at 60Hz against 264ms at 120Hz. The spring itself is exact
// — same measurement at a matched 176ms of simulated time put both rates on
// 866px of a 1000px scroll, to the pixel — and the difference is confined to the
// last handful of pixels, where nobody can see it.
const SPRING_MIN_RENDERED_STEP_PX = 1;

// Fallback frame duration for the first frame, where there is no previous
// timestamp to subtract. 60Hz.
const SMOOTH_FIRST_FRAME_MS = 16;

/** Opt-out. Put it on any element whose subtree must keep native wheel behaviour. */
const OPT_OUT_ATTRIBUTE = 'data-no-smooth-scroll';

const SCROLLABLE_OVERFLOW = /^(auto|scroll|overlay)$/;

type Axis = 'x' | 'y';

interface Animation {
  target: number;
  /**
   * The animation's own position, in fractional pixels, and the authority while
   * a gesture is in flight.
   *
   * NOT read back from the element, whose scroll offset is measured to round:
   * assigning 10.4 and reading it back returns 10. A loop that reads its own
   * output back loses the fraction every frame, and near the target — where each
   * step is well under a pixel — it stops moving while never getting close
   * enough to finish. Measured before this field existed: a 100px notch parked
   * at 98 with the frame callback rescheduling forever.
   */
  position: number;
  /**
   * Pixels per second, and the reason a spring beats a decay curve here: it
   * survives from one notch to the next, so a wheel arriving mid-flight adds to
   * a motion that is already moving instead of restarting one from rest.
   */
  velocity: number;
  /** What was last written out, to tell a still frame from a moving one. */
  rendered: number;
  frame: number;
  lastFrameTime: number;
  axis: Axis;
}

const animations = new WeakMap<Element, Animation>();

function offsetOf(el: Element, axis: Axis): number {
  return axis === 'y' ? el.scrollTop : el.scrollLeft;
}

function setOffset(el: Element, axis: Axis, value: number): void {
  if (axis === 'y') el.scrollTop = value;
  else el.scrollLeft = value;
}

function maxOffsetOf(el: Element, axis: Axis): number {
  return axis === 'y'
    ? el.scrollHeight - el.clientHeight
    : el.scrollWidth - el.clientWidth;
}

/** Where the next notch starts from: the pending target if one is in flight. */
function pendingOffsetOf(el: Element, axis: Axis): number {
  const running = animations.get(el);
  return running && running.axis === axis ? running.target : offsetOf(el, axis);
}

function stopAnimation(el: Element): void {
  const running = animations.get(el);
  if (!running) return;
  if (running.frame) cancelAnimationFrame(running.frame);
  animations.delete(el);
}

function canScroll(el: Element, axis: Axis, delta: number): boolean {
  const max = maxOffsetOf(el, axis);
  if (max <= 0) return false;
  const from = pendingOffsetOf(el, axis);
  // Clamped, so "one pixel left" still counts and "already at the end" does not.
  // Getting this wrong is what makes a nested scroller feel stuck: the inner
  // element keeps swallowing wheels it can no longer act on.
  return Math.min(Math.max(from + delta, 0), max) !== from;
}

/**
 * The element the browser would have scrolled, plus the axis to scroll it on.
 *
 * Walks the same chain the browser walks, with one addition: an element that can
 * only scroll SIDEWAYS answers a vertical wheel. That is the whole reason a
 * horizontal strip needed hand-written code before this existed.
 */
function scrollTargetFor(
  start: Element | null,
  delta: number
): { el: Element; axis: Axis } | null {
  // Whether anything nearer the pointer could already have taken this wheel
  // vertically. Once that is true the wheel keeps looking for VERTICAL room and
  // never falls sideways.
  //
  // The case: a wide table sits in an `overflow-x-auto` card whose body is the
  // vertical scroller. Scroll the body to its end and, without this, the next
  // wheel would find the card — which can only move sideways — and slide the
  // table across. Sideways is the right answer for a filmstrip, where nothing
  // scrolls vertically at all; it is a surprise anywhere the reader was already
  // scrolling down.
  let offeredVertically = false;

  for (let node = start; node; node = node.parentElement) {
    if (node.hasAttribute?.(OPT_OUT_ATTRIBUTE)) return null;

    const style = getComputedStyle(node);
    // Whether the element SCROLLS on an axis, which is not what the overflow
    // property says. Setting `overflow-x: auto` alone makes the computed
    // `overflow-y` resolve to `auto` as well — the spec turns `visible` into
    // `auto` when the other axis is not visible — so a strip that can only move
    // sideways reports a scrollable Y. Reading the property alone is what broke
    // the filmstrip: it looked vertically scrollable, took the vertical branch,
    // found nothing to scroll, and the sideways branch was never reached.
    const scrollsY =
      SCROLLABLE_OVERFLOW.test(style.overflowY) && maxOffsetOf(node, 'y') > 0;
    const scrollsX =
      SCROLLABLE_OVERFLOW.test(style.overflowX) && maxOffsetOf(node, 'x') > 0;

    if (scrollsY && canScroll(node, 'y', delta)) return { el: node, axis: 'y' };
    // Sideways ONLY when there is no vertical scrolling to compete with — not on
    // this element, and not on anything already passed. An element that scrolls
    // both ways keeps the conventional meaning of a wheel.
    if (
      !scrollsY &&
      !offeredVertically &&
      scrollsX &&
      canScroll(node, 'x', delta)
    ) {
      return { el: node, axis: 'x' };
    }
    if (scrollsY) offeredVertically = true;

    // `overscroll-behavior` is the author saying "the chain stops here". Honour
    // it exactly as the browser would, or a dialog's list would start scrolling
    // the page behind it the moment it hits its own end. Gated on actually
    // scrolling for the same reason as above: an element that moves on neither
    // axis is not a barrier, whatever it declares.
    if (
      (scrollsY && style.overscrollBehaviorY !== 'auto') ||
      (scrollsX && style.overscrollBehaviorX !== 'auto')
    ) {
      return null;
    }
  }

  const page = document.scrollingElement;
  if (page && canScroll(page, 'y', delta)) return { el: page, axis: 'y' };
  return null;
}

function animate(el: Element, axis: Axis, to: number): void {
  const running = animations.get(el);
  if (running && running.axis === axis) {
    running.target = to;
    if (!running.frame)
      running.frame = requestAnimationFrame((now) => tick(el, now));
    return;
  }
  // A different axis, or nothing in flight: start from where the element
  // actually is. Mid-flight on the SAME axis this must not happen — `position`
  // is ahead of the rounded offset, and resampling would drop the fraction.
  stopAnimation(el);
  const from = offsetOf(el, axis);
  const started: Animation = {
    target: to,
    position: from,
    velocity: 0,
    rendered: from,
    frame: requestAnimationFrame((now) => tick(el, now)),
    lastFrameTime: 0,
    axis,
  };
  animations.set(el, started);
}

function tick(el: Element, now: number): void {
  const running = animations.get(el);
  if (!running) return;
  running.frame = 0;

  // Frame-rate independent, and exactly so: this is the CLOSED FORM of a
  // critically damped spring, not a step of numerical integration. Integrating
  // by hand would make the result depend on how the frame times happened to fall
  // and could go unstable on a long frame — a hidden tab handing back a 5-second
  // gap is a real case. The analytic solution simply lands where the spring
  // would have been after that long.
  //
  //   x(t) = target + (A + B·t)·e^(−λt),  A = x₀ − target,  B = v₀ + λ·A
  //   v(t) = (B − λ·(A + B·t))·e^(−λt)
  const elapsed = running.lastFrameTime
    ? now - running.lastFrameTime
    : SMOOTH_FIRST_FRAME_MS;
  running.lastFrameTime = now;
  const dt = elapsed / 1000;
  const offset = running.position - running.target;
  const slope = running.velocity + SPRING_RATE_PER_SECOND * offset;
  const decay = Math.exp(-SPRING_RATE_PER_SECOND * dt);
  running.position = running.target + (offset + slope * dt) * decay;
  running.velocity =
    (slope - SPRING_RATE_PER_SECOND * (offset + slope * dt)) * decay;

  // Under a pixel left is nothing a screen can render, so land on the target in
  // THIS frame rather than spending another one on it. Testing after the
  // integration and not before is what removes the last stall: checked at the
  // top, the frame that got within a pixel still painted its old offset and the
  // finish arrived a frame later, leaving `99, 99, 100` on the end of a gesture.
  const remaining = running.target - running.position;
  if (Math.abs(remaining) < SPRING_MIN_RENDERED_STEP_PX) {
    setOffset(el, running.axis, running.target);
    animations.delete(el);
    return;
  }

  // No still frames. Once the spring's own step drops below a rendered pixel it
  // would paint the same offset repeatedly; carry it a whole pixel instead.
  if (Math.round(running.position) === running.rendered) {
    running.position =
      running.rendered + Math.sign(remaining) * SPRING_MIN_RENDERED_STEP_PX;
  }

  running.rendered = Math.round(running.position);
  setOffset(el, running.axis, running.position);
  running.frame = requestAnimationFrame((next) => tick(el, next));
}

/**
 * Installs the listener. Call once, outside React — this is a document-level
 * concern with no component to own it, and StrictMode's double-invoked effects
 * would otherwise install it twice.
 *
 * @returns a function that removes it again, for tests.
 */
export function installSmoothScroll(): () => void {
  // The last few events, for `classifyWheelSource`. One buffer, not one per
  // element: a person has one input device in hand at a time, and the question
  // is about the device rather than about what is under the pointer.
  const samples: WheelSample[] = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // THE VERDICT IS PER GESTURE, AND IT DOES NOT CHANGE MID-GESTURE.
  //
  // Reported 2026-09-10: a trackpad scroll jerked two or three times in its
  // opening moments. It was this handler changing its mind while the flick was
  // still in the reader's fingers. `classifyWheelSource` needs eight samples
  // before it answers, so the first events fell back to
  // `provisionalWheelSource`, which asks only whether one delta is >= 48px -
  // true partway up a flick's ramp and false either side of it. So one gesture
  // ran native (browser scrolls), then eased (this handler animates
  // `scrollTop`), then native again, and each handover is a visible jump
  // because the two scrollers have different ideas of where the element is
  // going. Nothing was wrong with the easing curve; the jerk was the SWITCH.
  //
  // Three variables replace that. `lastEventTime` finds the gesture boundary,
  // `gestureSource` locks the answer for the gesture's duration, and
  // `settledSource` carries the last CONFIDENT verdict across the gap, for the
  // one case a single opening event cannot settle.
  //
  // Measured 2026-09-10 on /events, replaying a recorded flick shape as wheel
  // events with spoofed timestamps and counting how often `defaultPrevented`
  // changed WITHIN one gesture: before, 4 handovers on the first flick and 2 on
  // every flick after it - the reported "giật 2-3 lần". After, 0 on all five
  // flicks and 0 on three mouse gestures, trackpad fully native and wheel fully
  // eased from their first event each.
  let lastEventTime = 0;
  let gestureSource: WheelSource | null = null;
  let settledSource: WheelSource | null = null;

  const onWheel = (e: WheelEvent) => {
    if (e.defaultPrevented || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    const target = e.target instanceof Element ? e.target : null;
    const unitScale =
      e.deltaMode === WHEEL_DELTA_MODE_LINE
        ? WHEEL_LINE_HEIGHT_PX
        : e.deltaMode === WHEEL_DELTA_MODE_PAGE
          ? null // resolved once the element is known — a page is that element's height
          : 1;

    // A first pass in raw units is enough to pick the element; PAGE is the only
    // mode whose pixel size depends on which element that turns out to be.
    const found = scrollTargetFor(target, e.deltaY * (unitScale ?? 1));
    if (!found) return;

    const unit =
      unitScale ??
      (found.axis === 'y' ? found.el.clientHeight : found.el.clientWidth);
    const delta = e.deltaY * unit;

    // A new gesture starts from nothing. Carrying the previous gesture's
    // samples across the pause mixes two hand movements in one window, and the
    // boundary gap itself is not a gap between two events of any stream.
    if (e.timeStamp - lastEventTime >= WHEEL_GESTURE_IDLE_MS) {
      samples.length = 0;
      gestureSource = null;
    }
    lastEventTime = e.timeStamp;

    samples.push({ time: e.timeStamp, delta });
    if (samples.length > WHEEL_SAMPLE_COUNT) samples.shift();

    // Refines the answer for the NEXT gesture, never for this one.
    const verdict = classifyWheelSource(samples);
    if (verdict) settledSource = verdict;

    // MEMORY IS THE TIE-BREAKER, NOT THE AUTHORITY. `settledSource` is about the
    // gesture before this one, and the reader may have changed hands since:
    // measured 2026-09-10, a remembered `stepped` eased a whole trackpad flick
    // taken up after a mouse. So an opening event decisive enough to contradict
    // it wins, and memory only speaks inside the band where one event genuinely
    // cannot tell a fine detent from a ramp.
    gestureSource ??=
      decisiveWheelSource(delta) ??
      settledSource ??
      provisionalWheelSource(delta);
    const source = gestureSource;

    // Case 1 with an already-smooth input: hands off completely. Not
    // "preventDefault and assign" — letting the browser scroll it natively is
    // both cheaper and the only way overscroll, rubber-banding and scroll
    // anchoring keep working.
    if (found.axis === 'y' && (source === 'smoothed' || reducedMotion.matches))
      return;

    const from = pendingOffsetOf(found.el, found.axis);
    const next = Math.min(
      Math.max(from + delta, 0),
      maxOffsetOf(found.el, found.axis)
    );
    if (next === from) return;
    e.preventDefault();

    if (source === 'smoothed' || reducedMotion.matches) {
      stopAnimation(found.el);
      setOffset(found.el, found.axis, next);
      return;
    }
    animate(found.el, found.axis, next);
  };

  // A drag on a scrollbar, or any other scroll the reader drives directly,
  // outranks a target set by a wheel that has not landed yet.
  const onPointerDown = (e: PointerEvent) => {
    for (
      let node = e.target instanceof Element ? e.target : null;
      node;
      node = node.parentElement
    ) {
      stopAnimation(node);
    }
  };

  document.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('pointerdown', onPointerDown, true);
  return () => {
    document.removeEventListener('wheel', onWheel);
    document.removeEventListener('pointerdown', onPointerDown, true);
  };
}
