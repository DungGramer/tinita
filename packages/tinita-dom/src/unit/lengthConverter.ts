export class LengthConverter<T extends LengthUnit[]> {
  // Static conversion constants
  private static readonly MM_PER_INCH = 25.4;
  private static readonly CM_PER_INCH = 2.54;
  private static readonly PT_PER_INCH = 72;
  private static readonly PT_PER_PICA = 12;
  private static readonly PX_PER_INCH: number = LengthConverter.testDPI();
  /**
   * Rates for the units this converter was constructed with.
   *
   * `static` so every instance shares one table, which also means **the last
   * instance constructed wins**: `new LengthConverter('mm','cm')` after
   * `new LengthConverter('pt','pc')` leaves the first one unable to convert. Kept as it
   * was found; see the note on the constructor.
   */
  private static conversionRates: Partial<ConversionMap> = {};
  // Static method to initialize conversion rates
  private initializeConversionRates(
    units: LengthUnit[]
  ): Partial<ConversionMap> {
    const fullRates = {
      mm: {
        cm: 0.1,
        inch: 1 / LengthConverter.MM_PER_INCH,
        px: LengthConverter.PX_PER_INCH / LengthConverter.MM_PER_INCH,
        pt: LengthConverter.PT_PER_INCH / LengthConverter.MM_PER_INCH,
        pc:
          LengthConverter.PT_PER_INCH /
          LengthConverter.MM_PER_INCH /
          LengthConverter.PT_PER_PICA,
      },
      cm: {
        mm: 10,
        inch: 1 / LengthConverter.CM_PER_INCH,
        px: LengthConverter.PX_PER_INCH / LengthConverter.CM_PER_INCH,
        pt: LengthConverter.PT_PER_INCH / LengthConverter.CM_PER_INCH,
        pc:
          LengthConverter.PT_PER_INCH /
          LengthConverter.CM_PER_INCH /
          LengthConverter.PT_PER_PICA,
      },
      inch: {
        mm: LengthConverter.MM_PER_INCH,
        cm: LengthConverter.CM_PER_INCH,
        px: LengthConverter.PX_PER_INCH,
        pt: LengthConverter.PT_PER_INCH,
        pc: LengthConverter.PT_PER_INCH / LengthConverter.PT_PER_PICA,
      },
      px: {
        mm: LengthConverter.MM_PER_INCH / LengthConverter.PX_PER_INCH,
        cm: LengthConverter.CM_PER_INCH / LengthConverter.PX_PER_INCH,
        inch: 1 / LengthConverter.PX_PER_INCH,
        pt: LengthConverter.PT_PER_INCH / LengthConverter.PX_PER_INCH,
        pc:
          LengthConverter.PT_PER_INCH /
          LengthConverter.PX_PER_INCH /
          LengthConverter.PT_PER_PICA,
      },
      pt: {
        mm: LengthConverter.MM_PER_INCH / LengthConverter.PT_PER_INCH,
        cm: LengthConverter.CM_PER_INCH / LengthConverter.PT_PER_INCH,
        inch: 1 / LengthConverter.PT_PER_INCH,
        px: LengthConverter.PX_PER_INCH / LengthConverter.PT_PER_INCH,
        pc: 1 / LengthConverter.PT_PER_PICA,
      },
      pc: {
        mm:
          (LengthConverter.MM_PER_INCH / LengthConverter.PT_PER_INCH) *
          LengthConverter.PT_PER_PICA,
        cm:
          (LengthConverter.CM_PER_INCH / LengthConverter.PT_PER_INCH) *
          LengthConverter.PT_PER_PICA,
        inch: LengthConverter.PT_PER_PICA / LengthConverter.PT_PER_INCH,
        px:
          (LengthConverter.PX_PER_INCH / LengthConverter.PT_PER_INCH) *
          LengthConverter.PT_PER_PICA,
        pt: LengthConverter.PT_PER_PICA,
      },
    };

    const rates: Partial<ConversionMap> = {};

    for (const unit of units) {
      // `ConversionMap[K]` excludes `K` itself, so the self-pair is absent by
      // construction and the index below has to be widened to see it.
      const row: Partial<Record<LengthUnit, number>> = {};

      for (const toUnit of units) {
        if (unit === toUnit) continue;
        const rate = (fullRates[unit] as Partial<Record<LengthUnit, number>>)[
          toUnit
        ];
        if (rate !== undefined) row[toUnit] = rate;
      }

      rates[unit] = row;
    }

    return rates;
  }

  constructor(...units: T) {
    // this.supportedUnits = units as UnitSubset<T>;
    LengthConverter.conversionRates = this.initializeConversionRates(units);
  }

  // Static method to calculate DPI
  private static calculateDPI(mmHeight: number): number {
    // Fallback if document is not available
    if (typeof document === 'undefined') return 96.01199999999999;

    const div = document.createElement('div');
    div.style.height = `${mmHeight}mm`;
    document.body.appendChild(div);
    const dpi = (div.offsetHeight / mmHeight) * this.MM_PER_INCH;
    document.body.removeChild(div);
    return dpi;
  }

  public static testDPI(): number {
    const testCases = [50, 100, 500, 1000]; // mm heights
    const results = testCases.map((mm) => this.calculateDPI(mm));
    // console.log('DPI Results:', results);
    // console.log('Average DPI:', average);

    return results.reduce((sum, dpi) => sum + dpi, 0) / results.length;
  }

  // Static general conversion method
  convertUnits(
    value: number,
    fromUnit: UnitSubset<T>,
    toUnit: UnitSubset<T>
  ): number {
    // Same-unit first: the table deliberately has no self-pair, so looking one up
    // would throw "not supported" for a conversion that is simply the identity.
    if (fromUnit === toUnit) return value;

    const rate = LengthConverter.conversionRates[fromUnit]?.[toUnit];
    if (rate === undefined) {
      throw new Error(
        `Conversion from ${fromUnit} to ${toUnit} is not supported.`
      );
    }

    return rate * value;
  }
}

export type LengthUnit = 'mm' | 'cm' | 'inch' | 'px' | 'pt' | 'pc';

/**
 * Rate table: `map[from][to]` is how many `to` fit in one `from`.
 *
 * The inner record is `Partial` and does **not** exclude the key itself. Writing
 * it as `[P in Exclude<LengthUnit, K>]` does express "no mm to mm", but it makes the
 * type impossible to index with a union - and `convertUnits` takes exactly a
 * union, so every lookup became an error. The self-pair is prevented where it is
 * built, and `convertUnits` handles it at runtime.
 */
type ConversionMap = Record<LengthUnit, Partial<Record<LengthUnit, number>>>;

type UnitSubset<T extends LengthUnit[]> = T[number];
