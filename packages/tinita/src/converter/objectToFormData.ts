export interface ObjectToFormDataOptions {
  /**
   * How array values are represented in field names.
   *
   * - `indices`: `items[0]`, `items[1]`
   * - `brackets`: `items[]`, `items[]`
   *
   * @default 'indices'
   */
  arrayFormat?: 'indices' | 'brackets';

  /**
   * How `null` and `undefined` values are handled.
   *
   * - `omit`: do not append the field.
   * - `empty`: append an empty string.
   *
   * @default 'omit'
   */
  nullHandling?: 'omit' | 'empty';

  /**
   * Whether empty arrays should be appended as an empty field.
   *
   * @default false
   */
  includeEmptyArrays?: boolean;

  /**
   * Whether empty objects should be appended as an empty field.
   *
   * @default false
   */
  includeEmptyObjects?: boolean;
}

/**
 * Converts a nested plain object into `FormData`.
 *
 * Supports:
 * - nested objects
 * - arrays and nested arrays
 * - strings, numbers, booleans and bigint
 * - `Date`
 * - `Blob` and `File`
 * - `FileList`
 * - `null` and `undefined`
 *
 * Objects and arrays use bracket notation by default.
 *
 * @param obj Source object to convert.
 * @param options Serialization options.
 * @returns A new `FormData` containing the serialized values.
 *
 * @example
 * ```ts
 * const formData = objectToFormData({
 *   name: 'John',
 *   age: 30,
 *   active: true,
 *   avatar: file,
 *   tags: ['admin', 'user'],
 *   address: {
 *     city: 'Hanoi',
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * const formData = objectToFormData(
 *   { tags: ['admin', 'user'] },
 *   { arrayFormat: 'brackets' },
 * );
 * ```
 */
export function objectToFormData<T extends Record<string, unknown>>(
  obj: T,
  options: ObjectToFormDataOptions = {}
): FormData {
  const {
    arrayFormat = 'indices',
    nullHandling = 'omit',
    includeEmptyArrays = false,
    includeEmptyObjects = false,
  } = options;

  const formData = new FormData();

  const appendValue = (key: string, value: unknown): void => {
    if (value == null) {
      if (nullHandling === 'empty') {
        formData.append(key, '');
      }

      return;
    }

    if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) {
        formData.append(key, value.toISOString());
      }

      return;
    }

    // `typeof` guard first: FileList exists in no version of Node, so a bare
    // `instanceof` throws ReferenceError during SSR rather than falling through.
    if (typeof FileList !== 'undefined' && value instanceof FileList) {
      if (value.length === 0) {
        if (includeEmptyArrays) {
          formData.append(arrayFormat === 'brackets' ? `${key}[]` : key, '');
        }

        return;
      }

      Array.from(value).forEach((file, index) => {
        const fileKey =
          arrayFormat === 'brackets' ? `${key}[]` : `${key}[${index}]`;

        formData.append(fileKey, file);
      });

      return;
    }

    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        if (includeEmptyArrays) {
          formData.append(arrayFormat === 'brackets' ? `${key}[]` : key, '');
        }

        return;
      }

      value.forEach((item, index) => {
        const itemKey =
          arrayFormat === 'brackets' ? `${key}[]` : `${key}[${index}]`;

        appendValue(itemKey, item);
      });

      return;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);

      if (entries.length === 0) {
        if (includeEmptyObjects) {
          formData.append(key, '');
        }

        return;
      }

      entries.forEach(([childKey, childValue]) => {
        appendValue(`${key}[${childKey}]`, childValue);
      });

      return;
    }

    formData.append(key, String(value));
  };

  Object.entries(obj).forEach(([key, value]) => {
    appendValue(key, value);
  });

  return formData;
}
