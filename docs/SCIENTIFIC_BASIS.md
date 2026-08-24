# Scientific Basis & Validation

**AI Wellness Platform — credibility reference for clients and clinicians**

> **Status:** Draft for medical-team review. This document describes the scientific
> reasoning behind the platform's scores, biological-age estimate, age clocks, and
> reference ranges, and states plainly which parts are validated published methods
> and which are the platform's own constructions.
>
> **This document is not shipped inside the app.** It is a standalone reference for
> a technical or clinical reader who wants to interrogate how the numbers are made.
>
> Sections and specific figures marked **[MEDICAL REVIEW]** should be read and
> ratified (or corrected) by the supervising care team before this document is
> shared externally.

---

## 1. Overview & positioning

AI Wellness is a **wellness platform, not a diagnostic or treatment service.** It
takes biomarkers a participant provides (blood-panel values, body-composition
measurements, wearable data, and an in-app reaction-time screen), compares them
against published reference ranges, and produces:

- Three **pillar scores** (Vascular, Metabolic, Mental), each 0–100.
- A **biological age** estimate.
- Two **age clocks** (vascular age, metabolic age).
- An AI-drafted narrative and care plan.

Every one of these outputs is framed as *wellness insight*, never as diagnosis,
risk stratification, or treatment. The platform deliberately uses "areas to
monitor" rather than "risk factors" and "suggested discussion points" rather than
"treatment plan."

**Care-team sign-off model.** No score, narrative, or plan is presented to a
participant as final until a qualified member of the care team has reviewed it.
The AI produces a *draft*; a General Practitioner and a Traditional Chinese
Medicine practitioner sign off independently before a result is released. Pre
sign-off, any surfaced content is explicitly badged as an unreviewed AI draft.
This human-in-the-loop review is the platform's core safeguard against the failure
modes of a purely automated tool: it is the point at which a clinician can catch
an implausible extracted value, a misleading composite, or a score that does not
fit the person in front of them.

**What the participant is told, verbatim, on the platform:** *"This is general
wellness information, not medical advice."*

---

## 2. The three pillars

Each pillar is a 0–100 score summarizing a group of related biomarkers. The
grouping is the platform's own organizing scheme, not a clinical classification
system; it exists to make results legible, not to make a clinical judgment.

### Vascular

Cardiovascular and circulatory markers. Fed by:
`systolic_bp`, `diastolic_bp`, `resting_hr`, `hrv`, `total_cholesterol`, `ldl_c`,
`hdl_c`, `triglycerides`, `hscrp`, `homocysteine`, `lpa`.

### Metabolic

Metabolic, general-chemistry, organ-function, and body-composition markers. This
is the broadest pillar and doubles as the platform's general systemic-health
grouping. Fed by:
`fasting_glucose`, `hba1c`, `fasting_insulin`, `waist_hip_ratio`, `bmi`,
`body_fat_pct`, `visceral_fat`, `vitamin_d`, `vitamin_b12`, `ferritin`,
`uric_acid`, `alt`, `ast`, `creatinine`, `egfr`, `tsh`, the CGM summary stats
(`cgm_avg_glucose`, `cgm_gmi`, `cgm_variability`, `cgm_time_in_range`,
`cgm_time_above_range`, `cgm_time_below_range`), and `albumin`, `lymphocyte_pct`,
`mcv`, `rdw`, `alp`, `wbc`.

> Note: `albumin`, `lymphocyte_pct`, `mcv`, `rdw`, `alp`, and `wbc` are grouped
> under Metabolic for convenience, but their real purpose is to supply the nine
> inputs the PhenoAge biological-age formula needs (Section 4). On their own they
> are routine blood-count and chemistry values; their inclusion in the metabolic
> *pillar score* is a labeling choice, not a claim that a CBC value is
> "metabolic" in the narrow sense. **[MEDICAL REVIEW]** — confirm this grouping
> is acceptable, or whether these should be excluded from the pillar average and
> used only for PhenoAge.

### Mental

Cognitive and psychological-wellbeing markers, several of them self-reported or
derived. Fed by:
`reaction_time`, `cog_composite`, `sleep_quality`, `sleep_hours`, `stress_index`,
`stress_level`, `exercise_freq`.

> Note: several Mental inputs (`sleep_quality`, `stress_index`, `cog_composite`)
> are composites the platform computes internally from other measurements and
> have no independent external clinical reference. The Mental pillar is therefore
> the least externally grounded of the three. See limitations, Section 9.

---

## 3. Scoring methodology

### How a raw marker becomes 0–100

Every marker is scored against a reference range (`ref_low`, `ref_high`). The
scoring is **direction-aware**, which matters for a fit population where crossing
one bound is *good*, not a problem:

- **Two-sided markers** (e.g. TSH, MCV) — both bounds are undesirable. Score is
  100 inside the range and degrades outside either bound.
- **Higher-is-better markers** (e.g. HDL, eGFR, HRV, VO₂max) — only the *low*
  bound is undesirable. A value above the high bound scores 100, not a penalty.
- **Lower-is-better markers** (e.g. LDL, triglycerides, hs-CRP, fasting glucose,
  reaction time) — only the *high* bound is undesirable. A value below the low
  bound scores 100.

The direction of each marker is declared explicitly in `lib/ai/markerDirection.ts`;
anything not listed there is treated as two-sided.

**The degradation curve.** When a value is past its "bad" bound, the score is:

```
band      = ref_high - ref_low
distance  = how far past the bad bound the value sits
overshoot = distance / band
score     = max(0, round(100 - overshoot * 100))
```

In words: a value that overshoots the bad bound by one full reference-band width
scores 0; halfway there scores 50. The curve is **linear** and **relative to the
band width**, not to any published risk gradient.

**Pillar score** = the simple mean of the scores of whichever markers in that
pillar are actually on file, rounded. A pillar with *no* captured markers gets a
neutral default of **70** rather than 0 — absence of data is not evidence of
poor health.

### Honest description of what this is — and isn't

- The scoring formula is **proprietary and deterministic.** It is not an LLM call;
  identical inputs always produce identical scores. This is a deliberate design
  choice so results are reproducible and explainable.
- It is **not a named, validated clinical algorithm.** It is a transparent
  linear distance-from-range function. Its *reference ranges* are drawn from
  established sources (Section 7); its *scoring transform* is the platform's own.
- **Equal weighting.** Every marker in a pillar counts equally toward the mean.
  hs-CRP and TSH move a vascular/metabolic score by the same amount when equally
  out of range, even though their clinical weight differs. There is no
  evidence-weighted contribution model. **[MEDICAL REVIEW]** — confirm whether
  equal weighting is acceptable for this cohort, or whether certain markers
  should be up- or down-weighted.
- **Data-set dependence.** Because a pillar score is the mean of *present*
  markers, two participants with different panels are not scored on the same
  basis. A participant with only one metabolic marker on file has a metabolic
  score driven entirely by that one value. The count of missing markers is
  tracked and surfaced, but the score itself carries no confidence interval.
- **The linear/band-relative curve is a simplification.** Real clinical risk is
  rarely linear in distance-from-range, and the band width used as the
  denominator is the reference band, not a risk-derived scale. The score should
  be read as a *legible relative indicator*, not a calibrated risk measure.

---

## 4. Biological age

The platform reports a single **biological age** number. It is produced by one of
two methods depending on what data is available, and the two are clearly
distinguished.

### 4a. PhenoAge — a real, published, validated formula (preferred)

When all nine required inputs are on file, biological age is computed with
**PhenoAge (Levine et al., 2018)** — the actual published formula and
coefficients, implemented directly in `lib/ai/phenoAge.ts`, *not* a
reinterpretation.

> Levine ME, Lu AT, Quach A, et al. **"An epigenetic biomarker of aging for
> lifespan and healthspan."** *Aging (Albany NY).* 2018;10(4):573–591.

**What it is.** A "Phenotypic Age" estimate derived from nine routine blood
biomarkers plus chronological age, using a Gompertz-mortality-based
transformation. In the NHANES-derived cohort on which it was developed and
validated, PhenoAge predicted 10-year all-cause mortality more accurately than
chronological age alone. The same formula and coefficients are reproduced
consistently across independent open-source implementations.

**Its nine required inputs** (all mandatory):

| Input | Marker key | Units used by the formula |
|---|---|---|
| Albumin | `albumin` | g/L |
| Creatinine | `creatinine` | µmol/L |
| Fasting glucose | `fasting_glucose` | mmol/L (converted from mg/dL on input) |
| hs-CRP | `hscrp` | mg/dL (converted from stored mg/L) |
| Lymphocyte percent | `lymphocyte_pct` | % |
| Mean cell volume (MCV) | `mcv` | fL |
| Red cell distribution width (RDW) | `rdw` | % |
| Alkaline phosphatase (ALP) | `alp` | U/L |
| White blood cell count | `wbc` | 10³/µL |
| *(plus chronological age)* | — | years |

**Design decision — all nine or nothing.** If any input is missing, the function
returns `null` rather than substituting a population average. A PhenoAge computed
from six of nine inputs is *not* the validated model — it is a different,
unvalidated number that merely shares the formula's shape. This is a deliberate
guard against presenting a partial computation as the published method.

**Unit-handling notes (for a technical reviewer).** The stored fasting-glucose
value (mg/dL) is divided by 18.02 to mmol/L; the stored hs-CRP (mg/L) is divided
by 10 to mg/dL, matching the reference `BioAge` implementation, which fits the
NHANES CRP term in mg/dL. The `ln(CRP)` term is floored at a small positive
epsilon because `ln(0)` is undefined and real assays never report a true zero.
Creatinine is already stored in µmol/L. **[MEDICAL REVIEW]** — confirm the CRP
unit handling (mg/L ÷ 10 → mg/dL before the `ln` term) matches the intended
Levine input convention for this lab's reporting units.

### 4b. Composite fallback — the platform's own estimate (clearly labeled)

Until all nine PhenoAge inputs are on file, biological age falls back to a simple
composite the platform constructs itself:

```
avg   = mean of the three pillar scores
delta = clamp(round(avg - 70), -15, +10)
biological age = chronological age - delta
```

That is: chronological age nudged down when the average pillar score is above a
neutral 70, up when below, capped at −15 / +10 years.

- This is **not a validated formula and makes no mortality or healthspan claim.**
  It is a legible placeholder so the participant sees *a* number.
- Wherever biological age is computed, the code uses PhenoAge when the data
  supports it and this composite otherwise (`computePhenoAge(...) ?? composite`).
- The app and this document must always be honest about which one produced the
  displayed number. **[MEDICAL REVIEW]** — confirm the ±window (−15/+10) and the
  neutral anchor (70) are acceptable, and that the fallback is always visibly
  labeled as an estimate rather than PhenoAge.

---

## 5. Age clocks (vascular age, metabolic age)

The platform reports a **vascular age** and a **metabolic age**. Both are the
platform's **own simplified, transparent points models** — *informed by* named
published risk models but **not replications** of them. This distinction is
important and is stated in-code and here.

### Vascular age (`computeVascularAge`)

Informed by the risk factors used in:

> D'Agostino RB Sr, Vasan RS, Pencina MJ, et al. **"General cardiovascular risk
> profile for use in primary care: the Framingham Heart Study."** *Circulation.*
> 2008;117(6):743–753.

and the related CDC "heart age" tool:

> Yang Q, et al. **"Vital Signs: Predicted Heart Age and Racial Disparities in
> Heart Age Among U.S. Adults."** *MMWR Morb Mortal Wkly Rep.* 2015.

**How it actually works.** It is a plain additive-points model. Chronological age
is adjusted up (or slightly down) by fixed year values for each factor present,
then bounded to −15 / +20 years:

| Factor detected | Years added |
|---|---|
| BP in ACC/AHA Stage 2 range (≥140/90) | +6 |
| BP in ACC/AHA Stage 1 range (≥130/80) | +3 |
| BP Elevated (systolic ≥120) | +1 |
| Total cholesterol >5.2 mmol/L or low HDL (sex-aware: men <1.03, women <1.29 mmol/L) | +4 |
| Current smoker | +8 |
| Glucose markers at/above ADA diabetes threshold | +6 |
| Resting HR <60 *and* HRV >55 (fitness, only if no other factor) | −2 |

**What it is NOT.** It does not use the Framingham/CDC regression coefficients.
Those models require inputs the platform does not capture as explicit fields —
notably **diagnosed-diabetes status** (here *proxied* from fasting glucose/HbA1c
against ADA thresholds) and **blood-pressure-medication use** (not captured at
all, and therefore never counted — a real, disclosed limitation). The fixed year
values are the platform's own calibration, not published effect sizes.
**[MEDICAL REVIEW]** — ratify or adjust each year value in the table above.

### Metabolic age (`computeMetabolicAge`)

Built on real metabolic-syndrome criteria:

> Alberti KGMM, Zimmet P, Shaw J. **The IDF consensus worldwide definition of the
> metabolic syndrome.** International Diabetes Federation, 2006.

and the NCEP ATP III framework. Chronological age is adjusted by fixed year
values per criterion met, bounded −10 / +20:

| Criterion (IDF/NCEP-derived) | Years added |
|---|---|
| Waist-to-hip ratio above WHO healthy ceiling (sex-aware) | +3 |
| Triglycerides ≥1.7 mmol/L | +3 |
| Low HDL (sex-aware: men <1.03, women <1.29 mmol/L) | +3 |
| BP ≥130/85 | +3 |
| Fasting glucose ≥126 mg/dL (ADA diabetes) | +5 |
| Fasting glucose 100–125 mg/dL (IDF threshold) | +3 |

**What it is NOT.** It is deliberately **not** the consumer body-composition-scale
"metabolic age" reported by devices like InBody or Tanita — that number compares
a person's basal metabolic rate to a population average and has no peer-reviewed
validation behind the specific figure it produces. The metabolic-syndrome
*criteria and thresholds* used here are real and cited; **converting those into an
age-equivalent is the platform's own construction** — no published paper maps a
metabolic-syndrome severity score onto an age. **[MEDICAL REVIEW]** — ratify or
adjust each year value.

### Why there is no cognitive/brain age

The platform **deliberately does not report a "cognitive age" or "brain age."**
Reaction time is a well-supported marker of processing speed with published links
to long-term health outcomes (Section 6), but **no peer-reviewed method converts a
reaction-time result into an age-equivalent** the way cardiovascular risk factors
can be mapped to a vascular age. Rather than invent that conversion, the Mental
pillar stays a 0–100 score only. This is a correct and defensible restraint.

---

## 6. Cognitive screen (ReCOGnAIze)

ReCOGnAIze is a short, in-app **simple reaction-time test.** The participant taps
a full-screen zone when a stimulus appears; the client records five valid trials
(false starts are discarded, not counted). The result is submitted to
`api/submit-recognize.ts`, which:

1. Averages the valid trial times → `reaction_time` (ms).
2. Maps that average onto a 0–100 `cog_composite` via a linear anchor:
   250 ms → 100, 400 ms → 70, extrapolated and clamped outside that band
   (`100 − ((avg − 250) / 150) × 30`).
3. Writes both as Mental-pillar biomarkers.

**What this is — stated plainly.**

- It is a **processing-speed screen**, not a validated cognitive assessment. It is
  not a substitute for a neuropsychological battery, and it does not screen for,
  detect, or rule out any cognitive condition.
- **The concept is grounded** in a substantial research base linking simple
  reaction time to cognitive performance and long-term outcomes:

  > Deary IJ, Der G. **"Reaction time explains IQ's association with death."**
  > *Psychological Science.* 2005;16(1):64–69.
  >
  > Hagger-Johnson G, et al. Reaction-time measures and mortality risk.
  > *PLOS ONE.* 2014. **[MEDICAL REVIEW]** — confirm exact title/volume before
  > external citation; described by method if unconfirmed.

- **The specific thresholds are the platform's own calibration** for a short,
  practical test (the 250 ms / 400 ms anchors and the reaction-time reference band
  of 250–400 ms). They are **not** taken from any published study's cutoffs. The
  `cog_composite` score is an internal linear transform with no external
  reference.
- **No brain-age claim** is made (Section 5).

**[MEDICAL REVIEW]** — the 250/400 ms anchors and the "5 valid trials" protocol
should be ratified; simple reaction time varies with device latency, input
method, age, and testing conditions, none of which are corrected for here.

---

## 7. Reference ranges & sources

Reference ranges are the platform's own configured values, drawn from established
sources where a recognized one exists and from standard clinical laboratory
reference intervals where it does not. **The platform never accepts a reference
range from the AI/model** — extraction only pulls the *value*; the range is always
the platform's, so flagging is consistent. Ranges are sex-aware where the
underlying source defines sex-specific bands.

The static, human-reviewed source content shown to participants lives in
`lib/methodology/content.ts`; the machine-readable ranges live in
`lib/ai/labCatalog.ts`, `lib/ai/bodyCompCatalog.ts`, and
`lib/ai/recognizeCatalog.ts`.

| Domain | Source basis | Notes |
|---|---|---|
| Blood pressure upper bounds | 2017 ACC/AHA hypertension guideline ("Normal" category) | — |
| Resting heart rate | AHA commonly-cited 60–100 bpm; platform band is narrower | Narrower than general guidance by design |
| Heart rate variability | Typical consumer-wearable values | **No clinical reference range exists** — not a guideline figure |
| Lipids (total, LDL, HDL, triglycerides) | NCEP ATP III lipid classification; Singapore MOH/ACE 2023 lipid guidance noted for LDL | HDL is **sex-aware** (men <1.03, women <1.29 mmol/L) — see below. **[MEDICAL REVIEW]** — MOH/ACE sets risk-based LDL targets (SG-FRS-2023); platform shows a general band, not a personalized target |
| hs-CRP | AHA/CDC cardiovascular risk-stratification categories | — |
| Homocysteine | Standard clinical lab reference interval | Not a single named guideline |
| Lipoprotein(a) | National Lipid Association 2024 risk-tier framework (lower-risk threshold) | **[MEDICAL REVIEW]** — confirm NLA 2024 threshold used |
| Fasting glucose, HbA1c | ADA Standards of Care **and Singapore MOH** diabetes CPG thresholds (diabetes at FPG ≥7.0 mmol/L or HbA1c ≥6.5%) | Also used to proxy diabetes in the age clocks |
| Fasting insulin | Common commercial-lab reference interval | No standardized guideline; immunoassays vary by manufacturer |
| Vitamin D | NIH / Institute of Medicine thresholds | Endocrine Society 2024 argues against a single universal cutoff — disclosed |
| Vitamin B12, ferritin, uric acid | Standard clinical lab reference intervals | Not a single named guideline |
| ALT, AST | Conventional clinical lab reference ranges | Some specialty guidelines (AASLD/ACG) argue the true normal range is stricter — disclosed |
| eGFR | Lower bound aligns with KDIGO CKD staging (G1 ≥90) | **Upper bound (130) is a display cap, not a KDIGO figure** — KDIGO defines no ceiling |
| Creatinine, albumin, ALP | Standard clinical lab reference intervals | Albumin & ALP exist primarily as PhenoAge inputs |
| CBC (lymphocyte %, MCV, RDW, WBC) | Standard adult clinical lab reference intervals | Exist primarily as PhenoAge inputs |
| TSH | General adult range cited by the American Thyroid Association | — |
| BMI | **Singapore HPB-MOH Asian cut-offs** (healthy 18.5–22.9, overweight ≥23, obese ≥27.5) | Regional standard, not the WHO 25/30 — see below |
| Body fat %, waist-to-hip ratio | **Sex-aware.** ACE body-composition categories (body fat %); WHO 2008 waist-to-hip guidance | See below |
| Visceral fat | Device-specific scale (e.g. InBody) | Not an external clinical guideline |
| CGM stats (TIR, TAR, TBR, variability) | 2019 International Consensus on Time in Range (ADA/EASD-endorsed) | Battelino et al. 2019 |
| CGM GMI | Bergenstal et al. GMI equation; floor set to a physiologically plausible 5.0% | See below |

### Sex-aware ranges

Three markers use meaningfully different healthy bands by sex
(`lib/ai/sexAwareRanges.ts`), applied at biomarker-write time:

- **Body fat %** — male 8–24%, female 21–31% (ACE categories). A single unisex
  band wrongly flags healthy values, especially for women. For unknown/other sex,
  the span 8–31% is used rather than guessing.
- **Waist-to-hip ratio** — ceiling 0.90 (male) / 0.85 (female), per the WHO 2008
  expert consultation. WHO defines no floor; a display floor of 0.70 is used.
- **HDL cholesterol** — low-HDL floor men <1.03 mmol/L (40 mg/dL), women
  <1.29 mmol/L (50 mg/dL), per NCEP ATP III / IDF (both define low HDL
  sex-specifically). HDL is higher-is-better, so only the floor drives flagging;
  the same sex-specific floors are applied in the vascular and metabolic age
  clocks. For unknown/other sex the less-aggressive male floor is used.

> ACE body-composition categories are an organizational reference chart, not a
> peer-reviewed study; the WHO 2008 waist-to-hip consultation is a formal WHO
> publication; the NCEP ATP III / IDF low-HDL sex thresholds are formal guideline
> values. All are described accurately as such.

### Singapore MOH grounding

Because the platform serves an Asian population, region-specific guidance from
Singapore's Ministry of Health (MOH), Health Promotion Board (HPB), and Agency
for Care Effectiveness (ACE) is used wherever it applies, in preference to a
generic international default:

- **BMI — HPB-MOH Asian cut-offs.** Healthy 18.5–22.9, overweight ≥23, obese
  ≥27.5 (HPB–MOH Clinical Practice Guidelines on Obesity), replacing the WHO
  international 25/30. Asians develop diabetes, hypertension, and CVD at a lower
  BMI at equivalent body fat, so the WHO cut-off under-flags this cohort.
- **Diabetes — MOH diabetes CPG.** The fasting-glucose and HbA1c diagnostic
  thresholds the platform uses (diabetes at FPG ≥7.0 mmol/L or HbA1c ≥6.5%)
  coincide with both the ADA Standards of Care and the MOH CPG, so no value
  changed — MOH is now cited alongside the ADA.
- **Lipids — MOH/ACE 2023 lipid guidance.** **[MEDICAL REVIEW]** ACE's 2023
  *Lipid management* guidance sets LDL targets by an individual's cardiovascular
  risk (the SG-FRS-2023 risk score), not a single cut-off. The platform does not
  compute SG-FRS-2023 (it does not capture every input the score needs), so LDL
  is shown against a general wellness reference band and explicitly framed as not
  a personalized target. Adopting risk-based LDL targets would require capturing
  the risk-score inputs and is a decision for the care team.

> **Not yet adopted (candidates for the care team):** MOH/HPB and the
> Asian-Pacific consensus also define an Asian **waist-circumference** cut-off
> (men ≥90 cm, women ≥80 cm). The platform currently scores waist-to-hip ratio,
> not raw waist circumference; adding waist circumference with these cut-offs is a
> proposed enhancement, not a shipped range.

### Corrections found and made during range review

A citation-research pass over the ranges caught genuine defects (all fixed
in the referenced files):

- A physiologically impossible **CGM GMI floor of 4.0%** (which by the Bergenstal
  equation implies ~29 mg/dL average glucose, not survivable). Corrected to 5.0%
  (~70 mg/dL).
- An **invented eGFR ceiling** — KDIGO defines none; the displayed upper value is
  now documented as a practical display cap.
- **Unisex body-fat and waist-to-hip ranges** replaced with the sex-aware bands
  above.
- A **unisex HDL floor (1.0 mmol/L)** replaced with the NCEP ATP III / IDF
  sex-specific low-HDL thresholds (men <1.03, women <1.29 mmol/L), in scoring,
  flagging, and both age clocks — the previous unisex floor under-flagged low HDL
  in women. A prior direction bug that reported a low-flagged higher-is-better
  marker (e.g. low HDL) against its *upper* bound was also fixed to report the
  correct (lower) bound.
- The **BMI ceiling** was moved from the WHO's 25 to Singapore's HPB-MOH Asian
  cut-off of 22.9 (overweight ≥23), matching the population the platform serves.

### Unit conversion

Regional lab reports print markers in varying units. Rather than ask the model to
convert (which it may do inconsistently), the platform extracts the raw value and
unit as printed and converts deterministically in `lib/ai/unitConversion.ts`
(e.g. cholesterol mg/dL → mmol/L, HbA1c IFCC mmol/mol → DCCT %, creatinine mg/dL →
µmol/L). Unrecognized units are kept unconverted and left visible/flagged for
admin review rather than silently dropped. **[MEDICAL REVIEW]** — spot-check the
conversion factors against this lab's actual reporting units.

---

## 8. Data handling & consent

- **Consent is recorded** the first time a participant is seen authenticated;
  the consent step structurally precedes account creation. Consent status and
  timestamp are surfaced to the care team.
- **Consent can be withdrawn** by the participant in-app. Withdrawal is
  **non-destructive by design** — data is not auto-deleted; the withdrawal is
  recorded and surfaced to the care team for handling per the retreat's data
  policy. The participant is signed out on withdrawal.
- **Access control.** Biomarkers are participant-read-only; only the care team
  (or the server's service role) can write them, enforced at the database level
  (row-level security). Even a participant's own reaction-time result is written
  server-side for this reason.
- **Uploads** (lab reports, body-composition scans) are size- and type-limited at
  both the client and the storage bucket. Extraction of values from uploaded
  documents uses a vision model; **extracted values are written as pending review**
  and are subject to the same care-team sign-off before they reach a participant.

> This section is a brief, honest summary of behavior, not a full data-protection
> or regulatory assessment. **[MEDICAL REVIEW / LEGAL REVIEW]** — a formal privacy
> and data-handling review is out of scope here and should be conducted
> separately.

---

## 9. Limitations & what this is NOT

**This is the most important section. Read it before relying on any number.**

1. **These are wellness estimates, not diagnoses.** No output is a clinical
   diagnosis, risk stratification, or treatment recommendation. Nothing here
   should delay or replace evaluation by a qualified clinician.

2. **Pillar scores are a proprietary linear transform, not a validated
   algorithm.** The distance-from-range curve is band-relative and linear, markers
   are equally weighted within a pillar, and the score carries no confidence
   interval. It is a legible relative indicator, not a calibrated risk measure.

3. **Scores depend on which markers happen to be on file.** Two participants are
   not necessarily scored on the same basis; a sparse panel can be dominated by a
   single value. Missing markers default the pillar toward a neutral 70.

4. **Biological age is two different things.** It is the *validated* PhenoAge
   formula only when all nine inputs are present; otherwise it is the platform's
   own unvalidated composite. PhenoAge itself was developed and validated on a
   specific (NHANES-derived) population and predicts population-level mortality
   risk — it is **not** a personal life-expectancy prediction, and its
   generalizability to this cohort (executive population, Nanjing retreat) has
   **not** been separately validated.

5. **Age clocks are the platform's own adaptations, not the published models they
   are informed by.** The vascular clock omits blood-pressure-medication status
   entirely and proxies diabetes from glucose markers; both clocks use
   platform-chosen year values, not published effect sizes. Do not present them as
   Framingham/IDF outputs.

6. **The cognitive screen is a reaction-time test, not a cognitive assessment.**
   It cannot detect, screen for, or rule out any cognitive condition. Its
   thresholds are internally calibrated and uncorrected for device latency, input
   method, or testing conditions. There is intentionally no brain-age number.

7. **Some inputs are self-reported or internally composited** (sleep quality,
   stress index, cognitive composite, exercise frequency). These have no external
   clinical reference and are only as reliable as the self-report behind them.

8. **AI-extracted values can be wrong.** Document extraction can misread a value;
   this is why extracted values are written as pending review and why care-team
   sign-off exists. An unreviewed AI draft is explicitly badged as such.

9. **No outcome validation on this cohort.** The platform's scores, age clocks,
   and composites have **not** been validated against any health outcome in this
   or any population. The published methods cited (PhenoAge, the risk models
   behind the clocks) were validated in *their* studies; the platform's *use and
   adaptation* of them here has not been independently validated.

10. **Reference ranges are population-general.** They are not personalized to
    ancestry, athletic status, pregnancy, or clinical history beyond the sex-aware
    exceptions noted. A value flagged "out of range" may be normal for a given
    individual, and vice versa — which is precisely what care-team review is for.

11. **This document reflects the implementation as read from source.** It should
    be re-checked whenever the scoring, catalogs, or formulas change.

---

## 10. References

Only real, confirmable sources are listed. Where a specific volume/issue could not
be independently confirmed in preparing this document, the entry is flagged for
verification and the method is otherwise described accurately in the body above.

1. Levine ME, Lu AT, Quach A, Chen BH, Assimes TL, Bandinelli S, et al. **"An
   epigenetic biomarker of aging for lifespan and healthspan."** *Aging (Albany
   NY).* 2018;10(4):573–591. — *PhenoAge biological-age formula (Section 4).*

2. D'Agostino RB Sr, Vasan RS, Pencina MJ, Wolf PA, Cobain M, Massaro JM, Kannel
   WB. **"General cardiovascular risk profile for use in primary care: the
   Framingham Heart Study."** *Circulation.* 2008;117(6):743–753. — *Informs the
   vascular age clock (Section 5).*

3. Yang Q, et al. **"Vital Signs: Predicted Heart Age and Racial Disparities in
   Heart Age Among U.S. Adults."** *MMWR Morb Mortal Wkly Rep.* 2015. — *CDC
   "heart age" tool; informs the vascular age clock.* **[VERIFY citation
   detail]**

4. Alberti KGMM, Zimmet P, Shaw J. **The IDF consensus worldwide definition of the
   metabolic syndrome.** International Diabetes Federation, 2006. — *Metabolic
   syndrome criteria behind the metabolic age clock (Section 5).*

5. National Cholesterol Education Program (NCEP) Expert Panel. **Third Report of
   the Expert Panel on Detection, Evaluation, and Treatment of High Blood
   Cholesterol in Adults (ATP III).** — *Lipid classification and metabolic
   syndrome criteria (Sections 5, 7).*

6. Deary IJ, Der G. **"Reaction time explains IQ's association with death."**
   *Psychological Science.* 2005;16(1):64–69. — *Reaction-time / outcome link
   (Section 6).*

7. Hagger-Johnson G, et al. Reaction-time measures and mortality risk. *PLOS ONE.*
   2014. — *Reaction-time / outcome link (Section 6).* **[VERIFY exact title and
   volume before external citation]**

8. Whelton PK, Carey RM, Aronow WS, et al. **2017 ACC/AHA/AAPA/ABC/ACPM/AGS/APhA/
   ASH/ASPC/NMA/PCNA Guideline for the Prevention, Detection, Evaluation, and
   Management of High Blood Pressure in Adults.** *2017.* — *Blood-pressure
   categories (Sections 5, 7).*

9. Battelino T, Danne T, Bergenstal RM, et al. **"Clinical Targets for Continuous
   Glucose Monitoring Data Interpretation: Recommendations From the International
   Consensus on Time in Range."** *Diabetes Care.* 2019. — *CGM time-in-range
   targets (Section 7).*

10. Bergenstal RM, Beck RW, Close KL, et al. **"Glucose Management Indicator
    (GMI): A New Term for Estimating A1C From Continuous Glucose Monitoring."**
    *Diabetes Care.* 2018. — *GMI equation; used to correct the CGM GMI floor
    (Section 7).*

11. World Health Organization. **"Waist Circumference and Waist–Hip Ratio: Report
    of a WHO Expert Consultation."** Geneva, 2008. — *Sex-aware waist-to-hip
    ratio ceilings (Section 7).*

12. Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group. **KDIGO
    Clinical Practice Guideline for the Evaluation and Management of Chronic
    Kidney Disease.** — *eGFR staging lower bound (Section 7).*

13. American Diabetes Association. **Standards of Care in Diabetes** (current
    edition). — *Fasting glucose / HbA1c thresholds (Sections 5, 7).*

14. American Council on Exercise (ACE). **Body-composition (percent body fat)
    categories.** — *Sex-aware body-fat ranges (Section 7). Reference chart, not a
    peer-reviewed study.*

15. National Lipid Association. **2024 Lp(a) risk-tier framework.** — *Lp(a)
    threshold (Section 7).* **[VERIFY exact document/threshold]**

16. Health Promotion Board – Ministry of Health, Singapore. **Clinical Practice
    Guidelines: Obesity.** — *Asian BMI cut-offs (healthy 18.5–22.9, overweight
    ≥23, obese ≥27.5) adopted in Section 7.*

17. Ministry of Health, Singapore. **Clinical Practice Guidelines: Diabetes
    Mellitus.** — *Fasting glucose / HbA1c diagnostic thresholds, cited alongside
    the ADA (Sections 5, 7).*

18. Agency for Care Effectiveness (ACE), Ministry of Health, Singapore. **"Lipid
    management: focus on cardiovascular risk."** ACE Clinical Guidance, Dec 2023.
    — *Risk-based (SG-FRS-2023) LDL targets; noted in Section 7.* **[MEDICAL
    REVIEW — not implemented as a personalized target]**

19. Alberti KGMM, Zimmet P, Shaw J. **"The IDF consensus worldwide definition of
    the metabolic syndrome."** International Diabetes Federation, 2006. —
    *Sex-specific low-HDL threshold, metabolic-syndrome criteria (Sections 5, 7).*

---

*Prepared from the platform source as of the document date. Items marked
**[MEDICAL REVIEW]** and **[VERIFY …]** require sign-off by the supervising care
team and a citation check before this document is used externally.*
