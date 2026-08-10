import type { Biomarker, Sex } from "../types/db";

export interface AgeClockDriver {
  label: string;
  years: number;
}

export interface AgeClockResult {
  age: number;
  drivers: AgeClockDriver[];
}

function findValue(biomarkers: Biomarker[], key: string): number | null {
  return biomarkers.find((b) => b.key === key)?.value ?? null;
}

/**
 * Vascular age: our own simplified, transparent points model, informed by the
 * risk factors used in the Framingham General CVD Risk Score (D'Agostino et
 * al. 2008, Circulation) and the CDC/MMWR "heart age" tool built on it (Yang
 * et al. 2015) -- NOT a replication of their exact regression. Those models
 * need inputs we don't capture as explicit fields (diagnosed-diabetes status,
 * blood-pressure-medication status) and their published coefficients aren't
 * something to hardcode without directly verifying the primary source, so
 * this is deliberately a simpler, honestly-labeled adaptation rather than a
 * claimed implementation of their statistical model. Diabetes is proxied from
 * fasting glucose/HbA1c against the same ADA thresholds already used
 * elsewhere in the app; blood-pressure-medication use isn't captured at all,
 * so it's never counted as a factor (a real limitation, not hidden).
 */
export function computeVascularAge(
  chronologicalAge: number,
  biomarkers: Biomarker[],
  smoking: boolean | undefined
): AgeClockResult {
  const drivers: AgeClockDriver[] = [];

  const systolic = findValue(biomarkers, "systolic_bp");
  const diastolic = findValue(biomarkers, "diastolic_bp");
  if (systolic !== null || diastolic !== null) {
    const sys = systolic ?? 0;
    const dia = diastolic ?? 0;
    if (sys >= 140 || dia >= 90) {
      drivers.push({ label: "Blood pressure in the Stage 2 range (ACC/AHA)", years: 6 });
    } else if (sys >= 130 || dia >= 80) {
      drivers.push({ label: "Blood pressure in the Stage 1 range (ACC/AHA)", years: 3 });
    } else if (sys >= 120) {
      drivers.push({ label: "Blood pressure in the Elevated range (ACC/AHA)", years: 1 });
    }
  }

  const totalCholesterol = findValue(biomarkers, "total_cholesterol");
  const hdl = findValue(biomarkers, "hdl_c");
  if ((totalCholesterol !== null && totalCholesterol > 5.2) || (hdl !== null && hdl < 1.0)) {
    drivers.push({ label: "Cholesterol outside the NCEP ATP III reference band", years: 4 });
  }

  if (smoking) {
    drivers.push({ label: "Current smoker", years: 8 });
  }

  const fastingGlucose = findValue(biomarkers, "fasting_glucose");
  const hba1c = findValue(biomarkers, "hba1c");
  if ((fastingGlucose !== null && fastingGlucose >= 126) || (hba1c !== null && hba1c >= 6.5)) {
    drivers.push({ label: "Glucose markers at/above the ADA diabetes threshold", years: 6 });
  }

  const restingHr = findValue(biomarkers, "resting_hr");
  const hrv = findValue(biomarkers, "hrv");
  if (restingHr !== null && restingHr < 60 && hrv !== null && hrv > 55 && drivers.length === 0) {
    drivers.push({ label: "Resting heart rate and HRV both reflect strong fitness", years: -2 });
  }

  const totalYears = drivers.reduce((sum, d) => sum + d.years, 0);
  const bounded = Math.max(-15, Math.min(20, totalYears));
  return { age: Math.round(chronologicalAge + bounded), drivers };
}

/**
 * Metabolic age-equivalent: our own construction, following the same
 * age-equivalent framing as vascular age, but built on real IDF (Alberti et
 * al. 2006) / NCEP ATP III metabolic syndrome criteria rather than a
 * commercial body-composition-scale "metabolic age" -- that consumer version
 * (InBody/Tanita) is a BMR-vs-population-average comparison with no
 * peer-reviewed validation behind the specific number it reports, so it's
 * deliberately not what this is based on. No published paper converts a
 * metabolic-syndrome severity score directly into an age-equivalent, so this
 * conversion step is ours, not a cited algorithm -- the criteria themselves
 * are real and cited; the age framing is not.
 */
export function computeMetabolicAge(
  chronologicalAge: number,
  biomarkers: Biomarker[],
  sex: Sex | undefined
): AgeClockResult {
  const drivers: AgeClockDriver[] = [];

  const whr = findValue(biomarkers, "waist_hip_ratio");
  const whrCeiling = sex === "female" ? 0.85 : 0.9;
  if (whr !== null && whr > whrCeiling) {
    drivers.push({ label: "Waist-to-hip ratio above the WHO healthy ceiling", years: 3 });
  }

  const triglycerides = findValue(biomarkers, "triglycerides");
  if (triglycerides !== null && triglycerides >= 1.7) {
    drivers.push({ label: "Triglycerides at/above the IDF metabolic syndrome threshold", years: 3 });
  }

  const hdl = findValue(biomarkers, "hdl_c");
  if (hdl !== null && hdl < 1.0) {
    drivers.push({ label: "HDL below the IDF metabolic syndrome threshold", years: 3 });
  }

  const systolic = findValue(biomarkers, "systolic_bp");
  const diastolic = findValue(biomarkers, "diastolic_bp");
  if ((systolic !== null && systolic >= 130) || (diastolic !== null && diastolic >= 85)) {
    drivers.push({ label: "Blood pressure at/above the IDF metabolic syndrome threshold", years: 3 });
  }

  const fastingGlucose = findValue(biomarkers, "fasting_glucose");
  if (fastingGlucose !== null) {
    if (fastingGlucose >= 126) {
      drivers.push({ label: "Fasting glucose at/above the ADA diabetes threshold", years: 5 });
    } else if (fastingGlucose >= 100) {
      drivers.push({ label: "Fasting glucose at/above the IDF metabolic syndrome threshold", years: 3 });
    }
  }

  const totalYears = drivers.reduce((sum, d) => sum + d.years, 0);
  const bounded = Math.max(-10, Math.min(20, totalYears));
  return { age: Math.round(chronologicalAge + bounded), drivers };
}
