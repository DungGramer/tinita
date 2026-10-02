import { assertFiniteNumber } from 'tinita/asserts/assertFiniteNumber';
import { assertPositiveFiniteNumber } from 'tinita/asserts/assertPositiveFiniteNumber';
export interface ResizeImageOptions {
  /** Crop origin inside the source image, in source pixels. @default 0 */
  x?: number;
  /** Crop origin inside the source image, in source pixels. @default 0 */
  y?: number;
  /** Divisor applied to both dimensions. `2` halves the image. @default 1 */
  scale?: number;
  /** Output media type passed to `canvas.toDataURL`. @default 'image/png' */
  type?: string;
  /** Output quality for lossy types, 0 to 1. Ignored by `image/png`. */
  quality?: number;
}

/**
 * Resize an image, given and returned as a `data:` URL.
 *
 * @param source anything usable as an `<img>` `src`: a data URL, blob URL or any
 *   same-origin URL. A cross-origin URL without CORS headers taints the canvas and
 *   makes `toDataURL` throw a `SecurityError`.
 *
 * **EXIF orientation is ignored.** A photo from a phone carries an orientation tag,
 * and `drawImage` paints the raw pixels: a portrait photo stored as landscape plus
 * a rotate tag comes back rotated. Browsers apply the tag when *displaying* an
 * `<img>` but canvas sees the stored pixels, so this is the canvas's behaviour, not
 * a bug here - and fixing it would mean parsing EXIF, which is a different library.
 * Pass the image through `createImageBitmap(blob, { imageOrientation: 'from-image' })`
 * first if orientation matters.
 *
 * @throws {TypeError} if `scale` is not a positive finite number, or if the
 *   browser gives no 2D canvas context.
 * @returns a promise rejecting with an `Error` if the image fails to load. The
 *   version this replaced never settled on a load failure, so the caller waited
 *   forever.
 *
 * @example
 * ```ts
 * const half = await resizeImage(dataUrl, { scale: 2 });
 * ```
 */
export function resizeImage(
  source: string,
  options: ResizeImageOptions = {}
): Promise<string> {
  const { x = 0, y = 0, scale = 1, type = 'image/png', quality } = options;

  assertPositiveFiniteNumber(scale, 'resizeImage', 'scale');

  // `quality` only applies to a lossy type - the spec says `toDataURL` ignores it for
  // image/png - so refusing a value there would reject a perfectly valid call.
  //
  // RangeError, not TypeError, and this is the one place in the repo that earns it:
  // 0..1 is an explicitly bounded interval, which is the distinction drawn in
  // docs/code-standards.md. The type problem is still a TypeError, reported first.
  //
  // It was unvalidated before, and silently: `toDataURL` ignores a quality outside
  // 0..1 and falls back to its default, so `quality: 1.5` returned a default-quality
  // image and said nothing.
  if (type !== 'image/png' && quality !== undefined) {
    assertFiniteNumber(quality, 'resizeImage', 'quality');
    if (quality < 0 || quality > 1) {
      throw new RangeError(
        `resizeImage: quality must be between 0 and 1, got ${quality}`
      );
    }
  }

  return new Promise<string>((resolve, reject) => {
    const img = document.createElement('img');

    img.onload = () => {
      const width = img.naturalWidth / scale;
      const height = img.naturalHeight / scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(
          new TypeError('resizeImage() could not get a 2D canvas context')
        );
        return;
      }

      // `img`, not `this`. The old code used a `function` expression so `this` was
      // the element, which typed as GlobalEventHandlers and is not a drawable
      // source. An arrow closing over `img` says the same thing and type-checks.
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      try {
        resolve(canvas.toDataURL(type, quality));
      } catch (error) {
        // A cross-origin source taints the canvas and toDataURL throws here.
        reject(error);
      }
    };

    img.onerror = () =>
      reject(new Error('resizeImage() could not load the given source'));

    img.src = source;
  });
}
