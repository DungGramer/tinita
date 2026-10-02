import { describe, expect, it } from 'vitest';
import {
  classifyWheelSource,
  decisiveWheelSource,
  provisionalWheelSource,
  WHEEL_DELTA_MODE_LINE,
  WHEEL_DELTA_MODE_PAGE,
  WHEEL_SAMPLE_COUNT,
  WHEEL_STEP_MIN_PIXELS,
  type WheelSample,
} from '../src/wheel-source';

/**
 * Builds a stream from a magnitude list and a fixed cadence. Written this way so
 * a case reads as the SHAPE it is describing - "eight detents, 60ms apart" -
 * rather than as a table of numbers.
 */
function stream(
  magnitudes: number[],
  gapMs: number,
  startAt = 1000
): WheelSample[] {
  return magnitudes.map((delta, i) => ({ time: startAt + i * gapMs, delta }));
}

/** A per-frame generator ramping up and decaying. Never twice the same number. */
const RAMP = [4.2, 9.7, 15.3, 18.1, 16.4, 11.2, 6.8, 3.1];

/**
 * A wheel spun hard: detent-sized, but the driver's acceleration means no single
 * magnitude dominates. Chrome's 100px notch alongside the 133.33px some drivers
 * report, rounded as the browser reports them.
 */
const ACCELERATED_DETENTS = [100, 133, 120, 100, 133, 120, 100, 133];

describe('classifyWheelSource', () => {
  it('refuses to answer before it has seen enough events', () => {
    // The caller keeps doing whatever it was doing. Flipping the scroll
    // behaviour on the second event of a gesture is worse than being late.
    const thin = stream(RAMP.slice(0, WHEEL_SAMPLE_COUNT - 1), 8);
    expect(classifyWheelSource(thin)).toBeNull();
    expect(classifyWheelSource([])).toBeNull();
  });

  it('calls a frame-clocked ramp smoothed', () => {
    expect(classifyWheelSource(stream(RAMP, 8))).toBe('smoothed');
  });

  it('calls a train of identical detents stepped', () => {
    // Chrome's 100px notch, one per 60ms.
    expect(classifyWheelSource(stream(Array(8).fill(100), 60))).toBe('stepped');
  });

  it('still calls it stepped when the wheel is spun fast enough to look continuous', () => {
    // 18ms apart passes the density test, and the magnitudes VARY, so the
    // repetition rule cannot answer this one either. Size is the only signal
    // left. A first version of this case used eight identical detents and was
    // therefore empty: it was being decided by the repetition rule, and
    // loosening `continuous && fineGrained` to `continuous || fineGrained` left
    // it green.
    expect(classifyWheelSource(stream(ACCELERATED_DETENTS, 18))).toBe(
      'stepped'
    );
  });

  it('calls a small but perfectly repeated quantum stepped', () => {
    // Dense AND small - both other signals say "smoothed". Only the fact that a
    // physical detent emits the SAME number every time separates them. This is
    // the case that exists to be caught: a fine encoder, or line-mode scaled to
    // pixels, spun quickly.
    expect(classifyWheelSource(stream(Array(8).fill(40), 10))).toBe('stepped');
  });

  it('reads a trackpad drift as smoothed', () => {
    const drift = [2.4, 3.9, 5.1, 6.7, 6.2, 5.5, 4.1, 2.8];
    expect(classifyWheelSource(stream(drift, 12))).toBe('smoothed');
  });

  it('reads magnitude, not signed delta, so scrolling up classifies the same', () => {
    // Deliberately the detent shape and not the ramp. Negating the ramp proves
    // nothing - small negative numbers are still below the size threshold, so
    // dropping the `Math.abs` leaves that version of this test green. Negating
    // detents is what exposes it: -120 also reads as "below 48" once the
    // absolute value is gone, and the stream flips to smoothed.
    expect(
      classifyWheelSource(
        stream(
          ACCELERATED_DETENTS.map((m) => -m),
          18
        )
      )
    ).toBe('stepped');
  });

  it('judges the tail, so a source that changes mid-stream is followed', () => {
    // A detent train, then the user lifts to a trackpad. The verdict must be
    // about what is arriving now, not about the whole history.
    const detents = stream(Array(8).fill(100), 60);
    const lastDetent = detents[detents.length - 1];
    const then = stream(RAMP, 8, lastDetent.time + 8);
    expect(classifyWheelSource([...detents, ...then])).toBe('smoothed');
  });

  // Đây là ca từng là `it.todo`. Owner chốt 2026-10-02: `null`.
  //
  // Một smoother bị tab nền throttle và một wheel encoder mịn nhấn từng notch cho
  // ra CÙNG hình dạng, và không timing lẫn magnitude nào tách được. `null` là câu
  // trả lời đã có tài liệu cho "chưa đủ bằng chứng", và nó GIỮ verdict đã chốt
  // trước đó thay vì ghi đè bằng một phỏng đoán.
  it('answers null for a sparse stream of small deltas, either source', () => {
    // smoother bị throttle: delta phân số, 80ms một event
    expect(
      classifyWheelSource(stream([4.2, 3.9, 3.6, 3.3, 3.0, 2.7, 2.4, 2.1], 80))
    ).toBeNull();
    // encoder mịn: delta nguyên, 200ms một event
    expect(
      classifyWheelSource(stream([12, 11, 13, 12, 11, 13, 12, 11], 200))
    ).toBeNull();
  });

  it('null PRESERVES a stepped verdict a real detent burst had settled', () => {
    // Đây là lý do chọn null thay vì 'smoothed': chuỗi 100px thật chốt 'stepped',
    // rồi một chuỗi thưa+nhỏ tới. Trả 'smoothed' sẽ xoá phán quyết đúng kia.
    const detents = stream(Array(8).fill(100), 60);
    expect(classifyWheelSource(detents)).toBe('stepped');

    const lastTime = detents[detents.length - 1].time;
    const sparse = stream(
      [12, 11, 13, 12, 11, 13, 12, 11],
      200,
      lastTime + 200
    );
    expect(classifyWheelSource([...detents, ...sparse])).toBeNull();
  });

  // deltaMode được đọc ở smooth-scroll.ts cho việc quy đổi đơn vị rồi BỊ BỎ ngay
  // trước khi lấy mẫu. Không trackpad nào báo line/page mode, nên nó là tín hiệu
  // chắc chắn - và nó lấy lại đúng ca encoder mà nhánh null ở trên phải bỏ.
  describe('deltaMode is checked before any timing inference', () => {
    it('calls a line-mode stream stepped even when it looks smooth', () => {
      // Hình dạng này KHÔNG có deltaMode thì ra 'smoothed': nhỏ và liên tục.
      const shape = stream([4.2, 3.9, 3.6, 3.3, 3.0, 2.7, 2.4, 2.1], 16);
      expect(classifyWheelSource(shape)).toBe('smoothed');

      const lineMode = shape.map((s) => ({
        ...s,
        deltaMode: WHEEL_DELTA_MODE_LINE,
      }));
      expect(classifyWheelSource(lineMode)).toBe('stepped');
    });

    it('rescues the sparse encoder case the null branch gives up on', () => {
      const sparse = stream([12, 11, 13, 12, 11, 13, 12, 11], 200);
      expect(classifyWheelSource(sparse)).toBeNull();

      const lineMode = sparse.map((s) => ({
        ...s,
        deltaMode: WHEEL_DELTA_MODE_LINE,
      }));
      expect(classifyWheelSource(lineMode)).toBe('stepped');
    });

    it('treats page mode the same way', () => {
      const shape = stream([4.2, 3.9, 3.6, 3.3, 3.0, 2.7, 2.4, 2.1], 16).map(
        (s) => ({ ...s, deltaMode: WHEEL_DELTA_MODE_PAGE })
      );
      expect(classifyWheelSource(shape)).toBe('stepped');
    });

    // Vắng deltaMode KHÔNG được hiểu là pixel mode, và pixel mode không loại trừ
    // gì cả - Chrome báo pixel mode cho cả chuột lăn.
    it('pixel mode and an absent deltaMode both rule nothing out', () => {
      const shape = stream([4.2, 3.9, 3.6, 3.3, 3.0, 2.7, 2.4, 2.1], 16);
      expect(classifyWheelSource(shape)).toBe('smoothed');
      expect(
        classifyWheelSource(shape.map((s) => ({ ...s, deltaMode: 0 })))
      ).toBe('smoothed');
    });
  });
});

describe('provisionalWheelSource', () => {
  it('calls a detent-sized first event stepped, in both directions', () => {
    expect(provisionalWheelSource(100)).toBe('stepped');
    expect(provisionalWheelSource(-100)).toBe('stepped');
  });

  it('calls a frame-sized first event smoothed, in both directions', () => {
    expect(provisionalWheelSource(4.2)).toBe('smoothed');
    expect(provisionalWheelSource(-4.2)).toBe('smoothed');
  });

  it('puts the threshold itself on the stepped side', () => {
    // Line mode's 3 lines × 16px lands exactly here, and it is a detent.
    expect(provisionalWheelSource(WHEEL_STEP_MIN_PIXELS)).toBe('stepped');
    expect(provisionalWheelSource(WHEEL_STEP_MIN_PIXELS - 0.01)).toBe(
      'smoothed'
    );
  });
});

// provisionalWheelSource('x') trả 'smoothed' - một câu trả lời SAI mà trông đúng,
// vì Math.abs('x') là NaN và NaN thất bại ở cả hai phép so sánh.
describe('wheel-source rejects garbage instead of answering confidently', () => {
  it('provisionalWheelSource no longer answers "smoothed" for a non-number', () => {
    expect(() => provisionalWheelSource('x' as never)).toThrow(TypeError);
    expect(() => provisionalWheelSource('x' as never)).toThrow(
      'provisionalWheelSource: delta must be a finite number, got string'
    );
    expect(() => provisionalWheelSource(Number.NaN)).toThrow(
      'provisionalWheelSource: delta must be a finite number, got NaN'
    );
  });

  it('decisiveWheelSource names itself, not its caller', () => {
    expect(() => decisiveWheelSource('x' as never)).toThrow(
      'decisiveWheelSource: delta must be a finite number, got string'
    );
  });

  it('classifyWheelSource rejects a non-array', () => {
    expect(() => classifyWheelSource(42 as never)).toThrow(
      'classifyWheelSource: samples must be an array, got number'
    );
  });
});
