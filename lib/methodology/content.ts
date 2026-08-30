export interface MethodologySection {
  title: string;
  /** Each string is one short paragraph — kept plain-language, not footnote-style. */
  paragraphs: string[];
}

// Content here reflects real, checked sources (major guideline bodies where one
// exists, standard clinical lab reference intervals where it doesn't) rather
// than AI-generated citations -- specific journal citations are exactly the
// kind of thing a model will confidently fabricate, so this file is written
// and reviewed as static content, not generated per-request.
export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    title: "How your scores are calculated",
    paragraphs: [
      "Each of your three pillar scores (Vascular, Metabolic, Mental) reflects how your captured biomarkers compare with their reference ranges: a value within range scores 100, and scores decrease the further a value sits outside its range. This scoring approach is proprietary to AI Wellness, not a specific named clinical algorithm, and it is not a diagnosis. The reference ranges it's measured against, listed below, are drawn from established clinical and scientific sources where one exists.",
      "Because this platform serves an Asian population, where Singapore's Ministry of Health (MOH), Health Promotion Board (HPB), or Agency for Care Effectiveness (ACE) publishes region-specific guidance — notably the Asian BMI cut-offs and the diabetes and lipid guidelines — the ranges below follow it. Where no region-specific standard applies, internationally recognised guidelines are used.",
      "Biological age uses a real published formula when your data supports it: PhenoAge (Levine et al., 2018, \"An epigenetic biomarker of aging for lifespan and healthspan,\" Aging, 10(4):573–591), built from nine blood biomarkers — albumin, creatinine, fasting glucose, hs-CRP, lymphocyte percent, mean cell volume (MCV), red cell distribution width (RDW), alkaline phosphatase, and white blood cell count — plus your chronological age. In the NHANES-derived cohort it was developed and validated on, it predicted 10-year all-cause mortality more accurately than chronological age alone. This is the actual published formula and coefficients, not our own reinterpretation of it, unlike the age clocks below.",
      "All nine inputs are required — a complete blood count plus a standard metabolic panel and hs-CRP, which most comprehensive lab panels already include. Until all nine are on file, biological age falls back to our own composite estimate (chronological age adjusted by how your three pillar scores compare with a neutral baseline) so you still see a number, honestly labeled as our own construction rather than PhenoAge.",
    ],
  },
  {
    title: "Your age clocks (Vascular age, Metabolic age)",
    paragraphs: [
      "Vascular age is our own simplified, transparent points model, informed by the risk factors used in the Framingham General Cardiovascular Risk Score (D'Agostino et al., 2008, Circulation) and the CDC's related \"heart age\" tool (Yang et al., 2015, MMWR) — it is not a replication of their exact statistical model. Those models use inputs we don't capture as explicit fields, including diagnosed-diabetes status and blood-pressure-medication use; diabetes is proxied here from fasting glucose/HbA1c against the same ADA thresholds used elsewhere on this page, and blood-pressure medication isn't factored in at all, since we don't currently ask about it.",
      "Metabolic age follows the same age-equivalent framing, built on real metabolic syndrome criteria (the IDF consensus definition, Alberti et al., 2006, and NCEP ATP III) rather than the body-composition-scale \"metabolic age\" some consumer devices report — that consumer version compares your metabolic rate to a population average with no published, peer-reviewed validation behind the specific number it produces, so it isn't what this is based on. The metabolic-syndrome criteria themselves are real and cited; converting that into an age-equivalent is our own construction, the same way it is for vascular age.",
      "We deliberately do not report a \"cognitive age\" or \"brain age.\" Symbol-digit processing speed is a genuinely well-supported marker of cognitive function (the Symbol Digit Modalities Test, Smith, 1982) — but no peer-reviewed study converts a processing-speed result into an age-equivalent number the way vascular age can be derived from cardiovascular risk factors. Rather than invent that conversion, the Mental pillar stays a 0-100 score.",
    ],
  },
  {
    title: "Blood pressure & heart rate",
    paragraphs: [
      "Blood pressure's upper bounds align with the \"Normal\" category in the 2017 ACC/AHA hypertension guideline.",
      "Resting heart rate is commonly cited as 60–100 bpm by the American Heart Association; our range is narrower than that general guidance.",
      "Heart rate variability (HRV) has no single clinical reference range — ours reflects typical values reported by consumer wearables, not a clinical guideline.",
    ],
  },
  {
    title: "Lipid panel",
    paragraphs: [
      "Total cholesterol, LDL, HDL, and triglyceride ranges align closely with the classic NCEP ATP III lipid classification framework. HDL uses sex-specific low thresholds (men <1.03 mmol/L, women <1.29 mmol/L), consistent with NCEP ATP III and the IDF.",
      "Singapore's MOH / Agency for Care Effectiveness (ACE) 2023 lipid guidance sets LDL treatment targets by an individual's cardiovascular risk (via the SG-FRS-2023 risk score) rather than a single cut-off. This platform does not compute that risk score, so LDL is shown against a general wellness reference band, not a personalized target — interpreting it against a risk-based target is a discussion for your care team.",
    ],
  },
  {
    title: "Inflammation & vascular risk markers",
    paragraphs: [
      "hs-CRP aligns with AHA/CDC cardiovascular risk-stratification categories.",
      "Homocysteine reflects a standard clinical laboratory reference interval rather than a single named guideline.",
      "Lipoprotein(a) aligns with the National Lipid Association's 2024 risk-tier framework, using its lower-risk threshold.",
    ],
  },
  {
    title: "Glucose & metabolic",
    paragraphs: [
      "Fasting glucose and HbA1c align with the diagnostic thresholds shared by the American Diabetes Association and Singapore's MOH diabetes clinical practice guidelines (diabetes at fasting glucose ≥7.0 mmol/L or HbA1c ≥6.5%).",
      "Fasting insulin has no standardized clinical guideline — immunoassays vary by manufacturer, so ours reflects a common commercial-lab reference interval.",
    ],
  },
  {
    title: "Vitamins & minerals",
    paragraphs: [
      "Vitamin D aligns with NIH/Institute of Medicine thresholds. Other bodies have used different thresholds over time — the Endocrine Society's 2024 guidance in particular argues against a single universal cutoff for the general population.",
      "Vitamin B12, ferritin, and uric acid reflect standard clinical laboratory reference intervals rather than a single named guideline body.",
    ],
  },
  {
    title: "Liver & kidney function",
    paragraphs: [
      "ALT and AST reflect conventional clinical laboratory reference ranges. Some specialty guidelines (AASLD/ACG) argue the true biologically-normal range is stricter than the lab convention used here.",
      "eGFR's lower bound aligns with the KDIGO chronic kidney disease staging guideline. KDIGO does not define a clinical upper bound for eGFR, so our displayed upper value is a practical display cap, not a guideline figure.",
      "Creatinine, albumin, and alkaline phosphatase (ALP) reflect standard clinical laboratory reference intervals rather than a single named guideline body. Albumin and ALP exist in this app specifically as two of the nine required inputs to the PhenoAge calculation described above.",
    ],
  },
  {
    title: "Complete blood count (CBC)",
    paragraphs: [
      "Lymphocyte percent, mean cell volume (MCV), red cell distribution width (RDW), and white blood cell count reflect standard adult clinical laboratory reference intervals rather than a single named guideline body — the same category as creatinine or homocysteine above. All four exist in this app specifically to supply the remaining required inputs to the PhenoAge calculation described at the top of this page; on their own they are routine blood-count values, not used elsewhere in this app's scoring.",
    ],
  },
  {
    title: "Thyroid",
    paragraphs: ["TSH aligns with the general adult range cited by the American Thyroid Association."],
  },
  {
    title: "Body composition",
    paragraphs: [
      "BMI uses Singapore's HPB-MOH Asian cut-offs (healthy 18.5–22.9, overweight ≥23, obese ≥27.5) rather than the WHO's international 25/30 thresholds, because Asian populations develop cardiometabolic risk at a lower BMI. This is appropriate for the population this platform serves.",
      "Body fat % and waist-to-hip ratio use separate ranges for men and women, since healthy ranges genuinely differ by sex — aligned with the American Council on Exercise's body composition categories and the WHO's 2008 waist-to-hip ratio guidance, respectively.",
      "Visceral fat level uses a device-specific scale (as reported by body composition scanners like InBody), not an external clinical guideline.",
    ],
  },
  {
    title: "Continuous glucose monitor (CGM) stats",
    paragraphs: [
      "Time in range, time above/below range, and glucose variability align with the 2019 International Consensus on Time in Range, endorsed by the ADA, EASD, and other diabetes organizations.",
    ],
  },
  {
    title: "Cognitive assessment (ReCOGnAIze)",
    paragraphs: [
      "ReCOGnAIze is a symbol-digit matching test: a key pairs each of ten symbols with a number, and you tap the number that matches the symbol shown, as fast as you can, for 60 seconds. This is the format of the Symbol Digit Modalities Test (Smith, 1982), a widely used measure of cognitive processing speed and attention.",
      "Your net score (correct minus incorrect matches) is mapped onto the Mental pillar's 0–100 cognitive-composite scale. That mapping is our own wellness calibration for a short, practical test — it is not a validated norm or a diagnostic cut-off, and it is not converted into a \"brain age\".",
    ],
  },
  {
    title: "Wellbeing & stress questionnaires (WHO-5, PSS-4)",
    paragraphs: [
      "Your Mental pillar also draws on two short, validated self-report questionnaires. The WHO-5 Well-Being Index (World Health Organization, 1998; validation review: Topp et al., 2015, Psychotherapy and Psychosomatics) is a five-item measure of subjective psychological wellbeing over the past two weeks; its raw 0–25 score is multiplied by 4 to give a 0–100 wellbeing percentage, where higher is better. We treat a score below 50 as a wellness area worth attention — deliberately as a wellbeing signal, not as a screen or diagnosis for any condition.",
      "The PSS-4 (Cohen & Williamson, 1988, the four-item short form of the Perceived Stress Scale, Cohen et al., 1983) measures how uncontrollable and overloaded you have found your life over the past month, scored 0–16 with two items reverse-keyed, where higher means more perceived stress. The PSS has no official clinical cut-offs, so the band we use to flag elevated stress is our own wellness heuristic, not a validated clinical threshold.",
      "Both instruments are used here purely as wellness snapshots to make the Mental pillar more than a processing-speed proxy. They are not diagnostic tools; a low wellbeing or high stress result is a prompt to talk with your care team, never a diagnosis.",
    ],
  },
  {
    title: "Composite scores without an external source",
    paragraphs: [
      "Sleep quality index, stress index, and cognitive composite score are calculated internally by AI Wellness from other captured measurements. They don't have an independent external clinical reference the way a lab value does.",
    ],
  },
  {
    title: "A note on all of this",
    paragraphs: [
      "This page describes how the platform's scoring works and where its reference ranges come from, for transparency. It is not medical advice. AI Wellness is a wellness platform, not a diagnostic or treatment service — always discuss your results with your care team.",
    ],
  },
];
