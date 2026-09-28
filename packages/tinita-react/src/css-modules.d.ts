/**
 * Ambient type for CSS Modules.
 *
 * `Readonly<Record<string, string>>` - not exact keys. Exact keys would need a tool
 * generating `.d.ts` from the CSS, i.e. machinery plus a new class of staleness
 * bugs. The safety level equals writing class strings by hand as before:
 * `styles.roott` is not caught, and neither was `'tnt-ping__boddy'`. Nothing is
 * lost relative to what we had.
 */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
