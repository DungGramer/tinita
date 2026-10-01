/**
 * A 10mm margin on each axis, as `[horizontal, vertical]`.
 *
 * **Not a standard** - one application's default, kept because it is a sane starting
 * point. It was previously declared inside `print/pageSizes`, next to ISO 216 values,
 * which read as though it carried the same authority.
 */
export const DEFAULT_PRINT_MARGINS: readonly [number, number] = [10, 10];
