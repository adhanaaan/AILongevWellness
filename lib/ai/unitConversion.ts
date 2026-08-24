type ConversionFn = (value: number) => number;

// Maps "key|source_unit" (normalized) -> converter to the catalog's fixed
// target unit. A real Innoquest-style regional lab report was found to print
// cholesterol/triglycerides/uric acid/creatinine in mg/dL, not the mmol/L or
// µmol/L this catalog assumes — rather than asking the model to convert in
// its head (which it may do inconsistently), it reports the raw value + the
// unit exactly as printed, and conversion happens here, deterministically.
const CONVERSIONS: Record<string, ConversionFn> = {
  "total_cholesterol|mg/dl": (v) => v / 38.67,
  "ldl_c|mg/dl": (v) => v / 38.67,
  "hdl_c|mg/dl": (v) => v / 38.67,
  "triglycerides|mg/dl": (v) => v / 88.57,
  "uric_acid|mg/dl": (v) => v * 59.48,
  "creatinine|mg/dl": (v) => v * 88.4,
  "fasting_glucose|mmol/l": (v) => v * 18.02,
  // Chinese/European labs often report HbA1c in IFCC mmol/mol; the catalog uses
  // DCCT %. DCCT% = 0.09148 x IFCC + 2.152 (an unconverted mmol/mol value would
  // read as a wildly out-of-range % and corrupt the metabolic pillar).
  "hba1c|mmol/mol": (v) => 0.09148 * v + 2.152,
  "hscrp|mg/dl": (v) => v * 10,
  "hscrp|mg/l": (v) => v,
  "vitamin_d|ng/ml": (v) => v * 2.496,
  "vitamin_b12|pg/ml": (v) => v * 0.7378,
  "ferritin|ng/ml": (v) => v, // ng/mL is numerically equal to µg/L
  "fasting_insulin|pmol/l": (v) => v / 6.945,
  "fasting_insulin|miu/l": (v) => v, // numerically equal to µIU/mL
  "albumin|g/dl": (v) => v * 10,
  // WBC as "x10^9/L" (common on SI/international CBC panels) is numerically
  // identical to the catalog's 10³/µL -- same count, different notation.
  "wbc|x10^9/l": (v) => v,
  "wbc|10^9/l": (v) => v,
  "wbc|k/ul": (v) => v,
  "wbc|k/µl": (v) => v,
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Converts a raw (key, value, rawUnit) triple as printed on a document into
 * the catalog's fixed target unit. Falls back to the raw value unconverted
 * if the unit is already the target, or if it's a unit this table doesn't
 * yet recognize (better to keep a possibly-wrong-unit value visible and
 * flagged for admin review than to silently drop it).
 */
export function convertToTargetUnit(key: string, value: number, rawUnit: string, targetUnit: string): number {
  const normalizedRaw = normalizeUnit(rawUnit);
  const normalizedTarget = normalizeUnit(targetUnit);
  if (normalizedRaw === normalizedTarget) return value;
  const converter = CONVERSIONS[`${key}|${normalizedRaw}`];
  return converter ? converter(value) : value;
}

/**
 * True if we can trust `value` against the catalog's target-unit reference range:
 * either the reported unit already IS the target unit, or we have a converter for
 * it. False means a unit mismatch we don't know how to convert (e.g. Lp(a) in
 * nmol/L against an mg/dL band) — the caller should store the value for review but
 * NOT score/flag it against the target range, or it produces a false result.
 */
export function isUnitConvertible(key: string, rawUnit: string, targetUnit: string): boolean {
  const normalizedRaw = normalizeUnit(rawUnit);
  const normalizedTarget = normalizeUnit(targetUnit);
  if (normalizedRaw === normalizedTarget) return true;
  return Boolean(CONVERSIONS[`${key}|${normalizedRaw}`]);
}
