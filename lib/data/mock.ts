import type {
  AiDraft,
  Biomarker,
  BiomarkerReading,
  BiomarkerSource,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileKind,
  FileRecord,
  KeyContributor,
  WearableConnection,
  OnboardingProgress,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OutOfRangeBiomarker,
  Participant,
  ParticipantSummary,
  Pillar,
  PillarScores,
  Pipeline,
  PipelineState,
  Review,
  ReviewStage,
  Sex,
} from "../types/db";
import type { Repository, SignedCard } from "./repository";
import { createSupabaseRepository } from "./supabase";
import { computeUnlockedSections } from "../onboarding/flow";
import { sexAwareRange } from "../ai/sexAwareRanges";
import { MARKER_DIRECTION, isMarkerFlagged } from "../ai/markerDirection";
import { computePillarScores, computeBiologicalAge } from "../ai/scoring";
import { computePhenoAge } from "../ai/phenoAge";

export const DEMO_PARTICIPANT_ID = "james-chen";

function nowIso(): string {
  return new Date().toISOString();
}

function dateOnlyIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateOnlyIso(d);
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");
}

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

const CHANNELS: CaptureChannelName[] = [
  "manual",
  "wearables",
  "body_composition",
  "lab_report",
  "recognize",
];

const PILLARS: Pillar[] = ["vascular", "metabolic", "mental"];

const ONBOARDING_SECTIONS: OnboardingSectionKey[] = [
  "personal_info",
  "lifestyle",
  "wearables",
  "body_composition",
  "lab_reports",
  "recognize",
];

function freshOnboardingProgress(participantId: string): OnboardingProgress {
  const sections = Object.fromEntries(
    ONBOARDING_SECTIONS.map((s) => [s, "not_started" as OnboardingSectionStatus])
  ) as Record<OnboardingSectionKey, OnboardingSectionStatus>;
  return { participant_id: participantId, sections, unlocked: computeUnlockedSections(sections) };
}

function completeOnboardingProgress(participantId: string): OnboardingProgress {
  const sections = Object.fromEntries(
    ONBOARDING_SECTIONS.map((s) => [s, "done" as OnboardingSectionStatus])
  ) as Record<OnboardingSectionKey, OnboardingSectionStatus>;
  return { participant_id: participantId, sections, unlocked: computeUnlockedSections(sections) };
}

interface BiomarkerTemplate {
  key: string;
  label: string;
  unit: string;
  ref_low: number;
  ref_high: number;
  source: BiomarkerSource;
  // Generation-realism hint for value CENTERING only, and only for markers that
  // lib/ai/markerDirection.ts leaves two-sided but that still read best when low
  // (stress). Flagging/direction for every mapped marker is single-sourced from
  // MARKER_DIRECTION — do not duplicate a mapped marker's direction here.
  lowerIsBetter?: boolean;
}

const BIOMARKER_TEMPLATES: Record<Pillar, BiomarkerTemplate[]> = {
  vascular: [
    { key: "systolic_bp", label: "Systolic blood pressure", unit: "mmHg", ref_low: 90, ref_high: 120, source: "wearable" },
    { key: "diastolic_bp", label: "Diastolic blood pressure", unit: "mmHg", ref_low: 60, ref_high: 80, source: "wearable" },
    { key: "resting_hr", label: "Resting heart rate", unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable" },
    { key: "hrv", label: "Heart rate variability", unit: "ms", ref_low: 40, ref_high: 70, source: "wearable" },
    { key: "total_cholesterol", label: "Total cholesterol", unit: "mmol/L", ref_low: 2.5, ref_high: 5.2, source: "lab_extract" },
    { key: "ldl_c", label: "LDL cholesterol", unit: "mmol/L", ref_low: 1.0, ref_high: 3.0, source: "lab_extract" },
    { key: "hdl_c", label: "HDL cholesterol", unit: "mmol/L", ref_low: 1.0, ref_high: 2.5, source: "lab_extract" },
    { key: "hscrp", label: "hs-CRP", unit: "mg/L", ref_low: 0, ref_high: 3.0, source: "lab_extract" },
  ],
  metabolic: [
    { key: "fasting_glucose", label: "Fasting glucose", unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract" },
    { key: "hba1c", label: "HbA1c", unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract" },
    // waist_hip_ratio/body_fat_pct's ref_low/ref_high below are display fallbacks
    // only -- genBiomarkersForScore always overrides them via sexAwareRange().
    { key: "waist_hip_ratio", label: "Waist-to-hip ratio", unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp" },
    { key: "bmi", label: "BMI", unit: "kg/m²", ref_low: 18.5, ref_high: 23, source: "body_comp" },
    { key: "body_fat_pct", label: "Body fat %", unit: "%", ref_low: 8, ref_high: 24, source: "body_comp" },
    { key: "visceral_fat", label: "Visceral fat", unit: "level", ref_low: 1, ref_high: 12, source: "body_comp" },
    { key: "vitamin_d", label: "Vitamin D", unit: "nmol/L", ref_low: 50, ref_high: 125, source: "lab_extract" },
    { key: "creatinine", label: "Creatinine", unit: "µmol/L", ref_low: 60, ref_high: 110, source: "lab_extract" },
    // CBC + general chemistry -- exist (with creatinine/fasting_glucose above
    // and hscrp under vascular) so demo participants' synthesized data covers
    // all 9 PhenoAge inputs and the health card shows the real formula, not
    // just the fallback composite.
    { key: "albumin", label: "Albumin", unit: "g/L", ref_low: 35, ref_high: 50, source: "lab_extract" },
    { key: "lymphocyte_pct", label: "Lymphocytes (%)", unit: "%", ref_low: 20, ref_high: 40, source: "lab_extract" },
    { key: "mcv", label: "MCV (mean cell volume)", unit: "fL", ref_low: 80, ref_high: 100, source: "lab_extract" },
    { key: "rdw", label: "RDW (red cell distribution width)", unit: "%", ref_low: 11.5, ref_high: 14.5, source: "lab_extract" },
    { key: "alp", label: "ALP (alkaline phosphatase)", unit: "U/L", ref_low: 44, ref_high: 147, source: "lab_extract" },
    { key: "wbc", label: "White blood cell count", unit: "10³/µL", ref_low: 4.5, ref_high: 11.0, source: "lab_extract" },
  ],
  mental: [
    { key: "reaction_time", label: "Cognitive reaction time", unit: "ms", ref_low: 250, ref_high: 400, source: "recognize" },
    { key: "cog_composite", label: "Cognitive composite score", unit: "/100", ref_low: 70, ref_high: 100, source: "recognize" },
    { key: "sleep_quality", label: "Sleep quality index", unit: "/100", ref_low: 70, ref_high: 100, source: "wearable" },
    { key: "sleep_hours", label: "Sleep duration", unit: "hours", ref_low: 7, ref_high: 9, source: "wearable" },
    { key: "stress_index", label: "Stress index", unit: "/100", ref_low: 0, ref_high: 40, source: "manual", lowerIsBetter: true },
    // Distinct from stress_index per the Person 2 capture spec — a second, independently-sourced
    // stress signal (self-reported day-to-day level vs. the composite index above).
    { key: "stress_level", label: "Stress level", unit: "/100", ref_low: 0, ref_high: 40, source: "manual", lowerIsBetter: true },
    { key: "exercise_freq", label: "Exercise frequency", unit: "days/wk", ref_low: 3, ref_high: 7, source: "manual" },
  ],
};

function genBiomarkersForScore(participantId: string, pillar: Pillar, score: number, seed: number, sex: Sex): Biomarker[] {
  const templates = BIOMARKER_TEMPLATES[pillar];
  return templates.map((t, i) => {
    const { ref_low, ref_high } = sexAwareRange(t.key, sex, t);
    const r = mulberry32(seed + i * 17)();
    const span = ref_high - ref_low;
    // Direction for value CENTERING comes from the central map first (a
    // lower-is-better marker's high score sits near ref_low); t.lowerIsBetter
    // is only a generation-realism hint for the few markers the map leaves
    // two-sided but that still read best low (stress).
    const lowerIsBetter = MARKER_DIRECTION[t.key] === "lower" || t.lowerIsBetter === true;
    const center = lowerIsBetter ? ref_low + span * (1 - score / 100) : ref_low + span * (score / 100);
    const jitter = (r - 0.5) * span * 0.3;
    const value = Math.round((center + jitter) * 100) / 100;
    // Flagging is direction-aware and single-sourced (lib/ai/markerDirection.ts),
    // matching the real backend (CLAUDE.md rule #3).
    const flagged = isMarkerFlagged(t.key, value, ref_low, ref_high);
    return {
      id: `bm-${participantId}-${t.key}`,
      participant_id: participantId,
      pillar,
      key: t.key,
      label: t.label,
      value,
      unit: t.unit,
      ref_low,
      ref_high,
      source: t.source,
      status: t.source === "lab_extract" ? "extracted" : t.source === "wearable" ? "imported" : "entered",
      flagged,
      updated_at: nowIso(),
    } as Biomarker;
  });
}

// Direction-aware, mirrors lib/ai/scoring.ts's computeOutOfRange (mock↔real
// parity, CLAUDE.md rule #3): a higher-is-better marker flagged low reports
// against ref_low, not ref_high.
function computeOutOfRange(biomarkers: Biomarker[]): OutOfRangeBiomarker[] {
  const out: OutOfRangeBiomarker[] = [];
  for (const b of biomarkers) {
    if (!b.flagged || b.value === null) continue;
    const value = b.value;
    const dir = MARKER_DIRECTION[b.key];
    let side: "low" | "high";
    if (dir === "higher") side = "low";
    else if (dir === "lower") side = "high";
    else side = b.ref_low !== null && value < b.ref_low ? "low" : "high";
    if (side === "high" && b.ref_high === null) continue;
    if (side === "low" && b.ref_low === null) continue;
    out.push({ key: b.key, value, ref_high: b.ref_high ?? 0, ref_low: b.ref_low ?? undefined, side });
  }
  return out;
}

function computeMissingBiomarkers(biomarkers: Biomarker[]): string[] {
  return biomarkers.filter((b) => b.value === null).map((b) => b.key);
}

const PILLAR_LABEL: Record<Pillar, string> = {
  vascular: "vascular",
  metabolic: "metabolic",
  mental: "mental",
};

// Formats a biomarker as "value unit" the way the hand-authored James draft does,
// handling the units that don't take a trailing space ("/100", "ratio", "level").
function bmDisplay(b: Biomarker): string {
  const u = b.unit;
  if (u === "ratio" || u === "level") return `${b.value}`;
  if (u.startsWith("/")) return `${b.value}${u}`;
  return `${b.value} ${u}`;
}

// A short guideline-body phrase for the markers the Methodology page actually
// cites, so generic demo drafts can name a real source the same way the
// hand-authored one does -- and stay silent (empty string) for everything else,
// never inventing a source. Mirrors lib/methodology/content.ts.
const GENERIC_GUIDELINE_NOTE: Record<string, string> = {
  fasting_glucose: " against the ADA's normal range",
  hba1c: " against the ADA's thresholds",
  waist_hip_ratio: " on the WHO's waist-to-hip guidance",
  bmi: " on the HPB-MOH Asian BMI cut-offs",
  body_fat_pct: " on the ACE body-composition categories",
  ldl_c: " within the standard lipid reference bands",
  hdl_c: " within the standard lipid reference bands",
  total_cholesterol: " within the standard lipid reference bands",
  hscrp: " relative to the AHA's cardiovascular threshold",
  vitamin_d: " against NIH/IOM thresholds",
  systolic_bp: " against ACC/AHA blood-pressure categories",
  diastolic_bp: " against ACC/AHA blood-pressure categories",
};

function humanizeGoals(goals: string[]): string {
  const g = goals.map((x) => x.toLowerCase());
  if (g.length === 0) return "your long-term wellness";
  if (g.length === 1) return g[0];
  return `${g.slice(0, -1).join(", ")} and ${g[g.length - 1]}`;
}

// Generates a demo participant's draft to the same depth standard as the
// hand-authored James Chen one: every point anchored to a real captured value,
// tied to the participant's stated goals, and reasoned across pillars -- so
// previews/demos show the deep report, not filler. James's own draft is
// hand-authored (pendingAiDrafts) and untouched; this covers the other 19.
function genAiDraftForScores(
  participantId: string,
  participant: Participant,
  scores: PillarScores,
  bioAgeOffset: number,
  chronologicalAge: number,
  biomarkers: Biomarker[]
): AiDraft {
  const entries = Object.entries(scores) as [Pillar, number][];
  const weakest = entries.slice().sort((a, b) => a[1] - b[1])[0];
  const strongest = entries.slice().sort((a, b) => b[1] - a[1])[0];
  const monitorPillar = weakest[1] < 70 ? weakest[0] : null;

  const named = biomarkers.filter((b) => b.value !== null);
  const flagged = named.filter((b) => b.flagged);
  const inRange = named.filter((b) => !b.flagged);
  const strongestInRange = inRange.filter((b) => b.pillar === strongest[0]);

  const biologicalAge =
    computePhenoAge(biomarkers, chronologicalAge) ?? Math.max(18, chronologicalAge - bioAgeOffset);
  const youngerBy = chronologicalAge - biologicalAge;
  const goalPhrase = humanizeGoals(participant.goals);

  // --- key_contributors: real values first, then cross-pillar + goal framing ---
  const keyContributors: KeyContributor[] = [];
  for (const b of flagged.slice(0, 3)) {
    keyContributors.push({
      text: `${b.label} is reading ${bmDisplay(b)}, outside its reference range of ${b.ref_low}–${b.ref_high}${GENERIC_GUIDELINE_NOTE[b.key] ?? ""} — one to keep an eye on as part of your ${PILLAR_LABEL[b.pillar]} picture.`,
      tone: "monitor",
    });
  }
  for (const b of strongestInRange.slice(0, 2)) {
    keyContributors.push({
      text: `${b.label} sits comfortably in range at ${bmDisplay(b)}, a genuine strength in your ${PILLAR_LABEL[strongest[0]]} profile and part of why it is your standout pillar (${strongest[1]}).`,
      tone: "good",
    });
  }
  keyContributors.push({
    text:
      youngerBy > 0
        ? `Your biological age is estimated at ${biologicalAge}, tracking ${youngerBy} year${youngerBy === 1 ? "" : "s"} younger than your chronological age of ${chronologicalAge} — a composite read across all three pillars, and a good sign for the longevity side of your goals.`
        : `Your biological age is estimated at ${biologicalAge}, close to your chronological age of ${chronologicalAge} — a composite read across all three pillars, with room to open up a gap as the areas below improve.`,
    tone: "good",
  });
  keyContributors.push({
    text: monitorPillar
      ? `Your stated focus on ${goalPhrase} lines up well with where the data points: your ${PILLAR_LABEL[monitorPillar]} pillar (${weakest[1]}) is where focused effort will show up fastest, while your ${PILLAR_LABEL[strongest[0]]} strength gives you the headroom to work on it.`
      : `Your stated focus on ${goalPhrase} is well supported here — all three pillars are in a healthy band, so the task is maintaining the balance across vascular, metabolic and mental rather than chasing any one number.`,
    tone: "good",
  });

  // --- strengths: anchored to real in-range values ---
  const strengths: string[] = [
    `${PILLAR_LABEL[strongest[0]].replace(/^./, (c) => c.toUpperCase())} health is your standout pillar (${strongest[1]}), a strong foundation for ${goalPhrase}.`,
  ];
  for (const b of strongestInRange.slice(0, 2)) {
    strengths.push(`${b.label} is comfortably in range at ${bmDisplay(b)}, a marker worth protecting.`);
  }
  strengths.push("Capture across wearables, labs and body composition is consistent, so this composite is a reliable picture rather than a partial one.");
  if (!monitorPillar) {
    strengths.push("No pillar is trending toward its reference boundary — an unusually balanced profile.");
  }

  // --- areas_to_monitor: only real flagged values, never invented ---
  const areasToMonitor: string[] = flagged.slice(0, 3).map(
    (b) => `${b.label} (${bmDisplay(b)}) is outside its reference range of ${b.ref_low}–${b.ref_high} and is worth tracking at your next check-in.`
  );
  if (monitorPillar && areasToMonitor.length === 0) {
    areasToMonitor.push(`Your ${PILLAR_LABEL[monitorPillar]} pillar (${weakest[1]}) is the lowest of the three and worth a follow-up conversation to confirm the trend.`);
  }

  // --- suggested_focus: highest-leverage first, tied to weakest pillar + goals ---
  const focusByPillar: Record<Pillar, string> = {
    metabolic: "Make your metabolic markers the primary focus — a lower-glycemic, higher-fibre approach is the highest-leverage lever you have, and it speaks directly to your longevity goals.",
    vascular: "Prioritise your vascular markers — steady aerobic activity and a lipid-friendly diet are the most reliable ways to move them, and they underpin the cardiovascular side of your goals.",
    mental: "Prioritise sleep and stress recovery — they are the fastest levers on your mental pillar and feed straight into your energy and focus.",
  };
  const suggestedFocus: string[] = [
    monitorPillar ? focusByPillar[monitorPillar] : focusByPillar[weakest[0]],
    "Add a weekly resistance session alongside your cardio — one of the most consistently supported ways to improve body composition and metabolic markers over time.",
    "Protect a consistent sleep window — it quietly supports cognition, cardiovascular recovery and glucose regulation all at once.",
    "Keep meal timing steady rather than skipping and over-compensating later, which tends to smooth out both energy and metabolic readings.",
    "Hold onto what is already working in your strongest pillar — maintenance there frees your attention for the areas that need it.",
  ];

  // --- discussion_points: precise, tied to the actual weak spots ---
  const discussionPoints: string[] = [];
  if (flagged.length > 0) {
    discussionPoints.push(`Ask about rechecking ${flagged.slice(0, 2).map((b) => b.label).join(" and ")} in three to six months to confirm whether the trend is moving rather than guessing.`);
  } else {
    discussionPoints.push(`Review your ${PILLAR_LABEL[weakest[0]]} markers at the next check-in to see whether they are stable or beginning to shift.`);
  }
  discussionPoints.push("Discuss whether your current activity mix is weighted the right way between cardio and resistance training for where your body composition sits.");
  discussionPoints.push("Talk through current recovery and stress load, since those shape several markers that a single snapshot cannot fully explain.");
  discussionPoints.push("Raise any relevant family history, which sits outside this data and would sharpen how closely the areas above are worth watching.");

  return {
    id: `draft-${participantId}`,
    participant_id: participantId,
    scores,
    // Real PhenoAge when the demo participant's synthesized biomarkers happen
    // to cover all 9 of its required inputs; otherwise the synthetic offset.
    biological_age: biologicalAge,
    chronological_age: chronologicalAge,
    key_contributors: keyContributors,
    strengths,
    areas_to_monitor: areasToMonitor,
    suggested_focus: suggestedFocus,
    discussion_points: discussionPoints,
    care_plan: {
      nutrition: [
        { title: "Favour whole foods and steady meals", detail: "Consistent timing helps smooth energy and metabolic readings." },
        { title: "Lower the glycemic load at breakfast", detail: "The meal that most often drives an early glucose drift." },
        { title: "Keep hydration steady", detail: "Spread water through the day rather than front- or back-loading it." },
      ],
      exercise: [
        { title: "Add a weekly resistance session", detail: "The most reliable lever on body composition over time." },
        { title: "Keep moving most days", detail: "Regular aerobic activity is the foundation your vascular markers rest on." },
        { title: "Add a short post-meal walk", detail: "A simple, effective way to blunt glucose spikes." },
      ],
      medications: [
        { title: "Keep your supplements in one place", detail: "Log what you currently take so your care team has the full picture." },
        { title: "Review any changes with your care team", detail: "Before adjusting anything, ahead of your next check-in." },
      ],
      sleep: [
        { title: "Guard a consistent 7-9 hour window", detail: "Aim for the same wake time, even on weekends." },
        { title: "Hold your wind-down on hard days", detail: "Travel and high-stress days are when sleep slips first." },
      ],
      mindfulness:
        monitorPillar === "mental"
          ? [
              { title: "Build in daily stress-recovery time", detail: "Your mental markers are trending toward the reference boundary." },
              { title: "Try a brief midday reset", detail: "A few quiet minutes on your highest-demand days." },
            ]
          : [
              { title: "Make room for daily recovery", detail: "Small, regular pauses protect the pillar that is already strong." },
              { title: "Notice what drains you most", detail: "Add recovery around the heaviest parts of your week." },
            ],
    },
    generated_at: nowIso(),
    edited_by_admin: false,
    missing_biomarkers: computeMissingBiomarkers(biomarkers),
    out_of_range: computeOutOfRange(biomarkers),
  };
}

const OTHER_NAMES: Array<{ name: string; age: number; sex: Sex }> = [
  { name: "Alexander Jameson", age: 61, sex: "male" },
  { name: "Morgan Chen", age: 47, sex: "female" },
  { name: "Sarah Whitfield", age: 52, sex: "female" },
  { name: "David Okafor", age: 55, sex: "male" },
  { name: "Priya Sharma", age: 49, sex: "female" },
  { name: "Marcus Webb", age: 63, sex: "male" },
  { name: "Elena Rodriguez", age: 44, sex: "female" },
  { name: "Thomas Lindqvist", age: 58, sex: "male" },
  { name: "Amara Okonkwo", age: 51, sex: "female" },
  { name: "Richard Chen", age: 60, sex: "male" },
  { name: "Victoria Ashworth", age: 46, sex: "female" },
  { name: "Kenji Nakamura", age: 54, sex: "male" },
  { name: "Fatima Al-Rashid", age: 50, sex: "female" },
  { name: "Robert Sterling", age: 59, sex: "male" },
  { name: "Grace Liu", age: 45, sex: "female" },
  { name: "Michael Bennett", age: 62, sex: "male" },
  { name: "Aisha Patel", age: 48, sex: "female" },
  { name: "William Foster", age: 57, sex: "male" },
  { name: "Charlotte Meyer", age: 53, sex: "female" },
];

const OTHER_STATES: PipelineState[] = [
  ...Array(9).fill("delivered"),
  ...Array(8).fill("gp_review"),
  "ai_drafted",
  "capturing",
];

// GP and TCM sign off independently -- these 8 "gp_review" demo rows show
// all three in-progress combinations coexisting (neither signed yet, GP
// signed first, TCM signed first), instead of implying GP always goes first.
const GP_REVIEW_SIGNED_STAGES: ReviewStage[][] = [
  [], [], [],
  ["gp"], ["gp"], ["gp"],
  ["tcm"], ["tcm"],
];

const ATTENTION_INDEXES = new Set([2, 7, 13]);

const GOALS_POOL = ["Longevity", "Energy & focus", "Weight management", "Stress resilience", "Sleep quality", "Cardiovascular fitness"];

class MockRepository implements Repository {
  private participants = new Map<string, Participant>();
  private captureChannels = new Map<string, CaptureChannel>();
  private biomarkers = new Map<string, Biomarker>();
  private biomarkerReadings = new Map<string, BiomarkerReading>();
  private aiDrafts = new Map<string, AiDraft>();
  private pendingAiDrafts = new Map<string, AiDraft>();
  private reviews = new Map<string, Review[]>();
  private pipelines = new Map<string, Pipeline>();
  private files = new Map<string, FileRecord[]>();
  private dailyLogs = new Map<string, DailyLog>(); // key: `${participantId}:${log_date}`
  private onboardingProgress = new Map<string, OnboardingProgress>();
  private listeners: Array<() => void> = [];

  constructor() {
    this.seed();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private seed() {
    const james: Participant = {
      id: DEMO_PARTICIPANT_ID,
      name: "James Chen",
      age: 58,
      sex: "male",
      height_cm: 178,
      weight_kg: 82,
      goals: ["Longevity", "Energy & focus", "Cardiovascular fitness"],
      exercise_frequency: "sometimes",
      smoking: false,
      alcohol_drinks_per_week: "1_to_7",
      consent_given: true,
      consented_at: nowIso(),
      medications: ["Omega-3", "Vitamin D", "Magnesium"],
      created_at: nowIso(),
    };
    this.participants.set(james.id, james);

    this.pipelines.set(james.id, {
      participant_id: james.id,
      state: "capturing",
      needs_attention: false,
      attention_reason: null,
      delivered_at: null,
    });
    this.reviews.set(james.id, []);
    this.files.set(james.id, []);

    const jamesChannelSeed: Array<[CaptureChannelName, CaptureChannelStatus, EnteredBy | null]> = [
      ["manual", "complete", "participant"],
      ["wearables", "complete", "participant"],
      ["recognize", "complete", "participant"],
      ["body_composition", "partial", "admin"],
      ["lab_report", "partial", "admin"],
    ];
    for (const [channel, status, entered_by] of jamesChannelSeed) {
      this.captureChannels.set(`${james.id}:${channel}`, {
        id: `cc-${james.id}-${channel}`,
        participant_id: james.id,
        channel,
        status,
        entered_by,
        updated_at: nowIso(),
      });
    }

    // Mirrors the capture-channel seed above: Questionnaire and Wearables are
    // fully done, Body Composition and Lab Reports are in progress, and
    // ReCOGnAIze stays locked until that middle trio all reach "done".
    const jamesSections: Record<OnboardingSectionKey, OnboardingSectionStatus> = {
      personal_info: "done",
      lifestyle: "done",
      wearables: "done",
      body_composition: "in_progress",
      lab_reports: "in_progress",
      recognize: "not_started",
    };
    this.onboardingProgress.set(james.id, {
      participant_id: james.id,
      sections: jamesSections,
      unlocked: computeUnlockedSections(jamesSections),
    });

    const jamesBiomarkers: Biomarker[] = [
      // Vascular — Good (74): all core + expanded markers in range.
      { id: "bm-james-chen-systolic_bp", participant_id: james.id, pillar: "vascular", key: "systolic_bp", label: "Systolic blood pressure", value: 118, unit: "mmHg", ref_low: 90, ref_high: 120, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-diastolic_bp", participant_id: james.id, pillar: "vascular", key: "diastolic_bp", label: "Diastolic blood pressure", value: 76, unit: "mmHg", ref_low: 60, ref_high: 80, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-resting_hr", participant_id: james.id, pillar: "vascular", key: "resting_hr", label: "Resting heart rate", value: 58, unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hrv", participant_id: james.id, pillar: "vascular", key: "hrv", label: "Heart rate variability", value: 62, unit: "ms", ref_low: 40, ref_high: 70, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-total_cholesterol", participant_id: james.id, pillar: "vascular", key: "total_cholesterol", label: "Total cholesterol", value: 4.9, unit: "mmol/L", ref_low: 2.5, ref_high: 5.2, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-ldl_c", participant_id: james.id, pillar: "vascular", key: "ldl_c", label: "LDL cholesterol", value: 2.6, unit: "mmol/L", ref_low: 1.0, ref_high: 3.0, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hdl_c", participant_id: james.id, pillar: "vascular", key: "hdl_c", label: "HDL cholesterol", value: 1.4, unit: "mmol/L", ref_low: 1.03, ref_high: 2.5, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hscrp", participant_id: james.id, pillar: "vascular", key: "hscrp", label: "hs-CRP", value: 1.2, unit: "mg/L", ref_low: 0, ref_high: 3.0, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },

      // Metabolic — Monitor (68): glucose + waist-hip already flagged; BMI and visceral fat
      // reinforce the same "monitor" story rather than contradict it.
      { id: "bm-james-chen-fasting_glucose", participant_id: james.id, pillar: "metabolic", key: "fasting_glucose", label: "Fasting glucose", value: 108, unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract", status: "needs_review", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-hba1c", participant_id: james.id, pillar: "metabolic", key: "hba1c", label: "HbA1c", value: 5.6, unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-waist_hip_ratio", participant_id: james.id, pillar: "metabolic", key: "waist_hip_ratio", label: "Waist-to-hip ratio", value: 0.93, unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-bmi", participant_id: james.id, pillar: "metabolic", key: "bmi", label: "BMI", value: 26.1, unit: "kg/m²", ref_low: 18.5, ref_high: 23, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-body_fat_pct", participant_id: james.id, pillar: "metabolic", key: "body_fat_pct", label: "Body fat %", value: 24, unit: "%", ref_low: 8, ref_high: 24, source: "body_comp", status: "entered", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-visceral_fat", participant_id: james.id, pillar: "metabolic", key: "visceral_fat", label: "Visceral fat", value: 13, unit: "level", ref_low: 1, ref_high: 12, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-vitamin_d", participant_id: james.id, pillar: "metabolic", key: "vitamin_d", label: "Vitamin D", value: 58, unit: "nmol/L", ref_low: 50, ref_high: 125, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },

      // Mental — Strong (81): all markers in range.
      { id: "bm-james-chen-reaction_time", participant_id: james.id, pillar: "mental", key: "reaction_time", label: "Cognitive reaction time", value: 320, unit: "ms", ref_low: 250, ref_high: 400, source: "recognize", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-cog_composite", participant_id: james.id, pillar: "mental", key: "cog_composite", label: "Cognitive composite score", value: 88, unit: "/100", ref_low: 70, ref_high: 100, source: "recognize", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-sleep_quality", participant_id: james.id, pillar: "mental", key: "sleep_quality", label: "Sleep quality index", value: 82, unit: "/100", ref_low: 70, ref_high: 100, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-sleep_hours", participant_id: james.id, pillar: "mental", key: "sleep_hours", label: "Sleep duration", value: 7.4, unit: "hours", ref_low: 7, ref_high: 9, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-stress_index", participant_id: james.id, pillar: "mental", key: "stress_index", label: "Stress index", value: 34, unit: "/100", ref_low: 0, ref_high: 40, source: "manual", status: "entered", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-stress_level", participant_id: james.id, pillar: "mental", key: "stress_level", label: "Stress level", value: 30, unit: "/100", ref_low: 0, ref_high: 40, source: "manual", status: "entered", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-exercise_freq", participant_id: james.id, pillar: "mental", key: "exercise_freq", label: "Exercise frequency", value: 4, unit: "days/wk", ref_low: 3, ref_high: 7, source: "manual", status: "entered", flagged: false, updated_at: nowIso() },
    ];
    for (const bm of jamesBiomarkers) this.biomarkers.set(bm.id, bm);

    // A couple of demo history points so the trend line on the pillar detail
    // page has something to show in mock mode too, not just live Supabase
    // data -- one marker trending the wrong way (fasting glucose), one
    // trending right (vitamin D), matching each marker's current jamesBiomarkers value.
    const jamesReadings: BiomarkerReading[] = [
      { id: "br-james-chen-fasting_glucose-1", participant_id: james.id, key: "fasting_glucose", value: 92, unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract", measured_at: daysAgo(180), file_id: null, created_at: nowIso() },
      { id: "br-james-chen-fasting_glucose-2", participant_id: james.id, key: "fasting_glucose", value: 108, unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract", measured_at: daysAgo(3), file_id: null, created_at: nowIso() },
      { id: "br-james-chen-vitamin_d-1", participant_id: james.id, key: "vitamin_d", value: 38, unit: "nmol/L", ref_low: 50, ref_high: 125, source: "lab_extract", measured_at: daysAgo(180), file_id: null, created_at: nowIso() },
      { id: "br-james-chen-vitamin_d-2", participant_id: james.id, key: "vitamin_d", value: 58, unit: "nmol/L", ref_low: 50, ref_high: 125, source: "lab_extract", measured_at: daysAgo(3), file_id: null, created_at: nowIso() },
    ];
    for (const r of jamesReadings) this.biomarkerReadings.set(r.id, r);

    this.pendingAiDrafts.set(james.id, {
      id: "draft-james-chen",
      participant_id: james.id,
      scores: { vascular: 74, metabolic: 68, mental: 81 },
      biological_age: 54,
      chronological_age: 58,
      key_contributors: [
        { text: "Fasting glucose sits at 108 mg/dL, above the ADA's normal range of 70-99 mg/dL, while HbA1c (5.6%) is still just inside range — together they suggest your longer-term average is holding but your day-to-day glucose is starting to drift. Given that longevity is your top goal, this is the single highest-value number for you to move, because metabolic drift compounds quietly over years.", tone: "monitor" },
        { text: "Waist-to-hip ratio is 0.93, above the WHO's healthy ceiling of 0.90 for men — for someone your age this pattern of central fat distribution is a more telling metabolic signal than BMI alone, and it is closely linked to the same glucose trend above.", tone: "monitor" },
        { text: "Visceral fat reads 13 on your body composition scan, just over the reference ceiling of 12 — it travels with the waist-to-hip ratio and the glucose reading as one connected central-adiposity story, which is why addressing them together tends to move all three at once.", tone: "monitor" },
        { text: "Your cardiovascular engine is genuinely strong for 58: resting heart rate of 58 bpm and HRV of 62 ms are both squarely in range and point to real aerobic conditioning — direct evidence you are already delivering on your cardiovascular-fitness goal.", tone: "good" },
        { text: "Your lipid profile is a clear asset — LDL at 2.6 mmol/L and HDL at 1.4 mmol/L both sit in the healthy NCEP reference bands, and hs-CRP of 1.2 mg/L is well under the AHA's 3.0 mg/L threshold, so systemic inflammation is low. This is the vascular headroom that lets you focus your effort on the metabolic side.", tone: "good" },
        { text: "Cognitive reaction time (320 ms) and composite score (88/100) are both strong, and they are being underwritten by your sleep — sharp processing speed like this is hard to sustain on poor rest, so your mental and sleep numbers are reinforcing each other and feeding directly into your energy-and-focus goal.", tone: "good" },
        { text: "Sleep is doing quiet, load-bearing work across your whole picture: 7.4 hours a night at a quality index of 82/100 is protecting your cognition, supporting your low resting heart rate, and helping regulate the very glucose pattern you are watching — one habit paying dividends in all three pillars.", tone: "good" },
      ],
      strengths: [
        "Vascular health is your standout pillar (74): blood pressure of 118/76, a resting heart rate of 58 bpm, HRV of 62 ms and clean lipids are all in range — a strong foundation for the cardiovascular fitness you told us you care about.",
        "Cognitive performance is high for your age — reaction time (320 ms) and composite score (88/100) are both well above the healthy floor, which is what a demanding executive schedule actually runs on.",
        "Your sleep is a genuine competitive advantage: 7.4 hours nightly at 82/100 quality is consistent enough to be protecting your cognition and your cardiovascular markers at the same time.",
        "Low inflammation (hs-CRP 1.2 mg/L) points to a well-managed vascular system and is a reassuring long-term signal for the longevity goal at the centre of your programme.",
        "You are already doing several of the right things — non-smoker, four active days a week, and a sensible supplement base of Omega-3, Vitamin D and Magnesium — so the metabolic work ahead builds on solid habits rather than starting from scratch.",
      ],
      areas_to_monitor: [
        "Fasting glucose (108 mg/dL) is above the ADA's normal range and is the clearest early metabolic signal in your data — worth a recheck alongside HbA1c to confirm the direction.",
        "Waist-to-hip ratio (0.93) and visceral fat (13) both sit just outside their reference ranges and point to the same central-fat pattern, which is the mechanism most likely driving the glucose trend.",
        "BMI (26.1) is in the overweight band on Singapore's HPB-MOH Asian cut-offs (healthy ceiling 22.9) — less informative on its own than the waist and visceral readings, but consistent with them.",
      ],
      suggested_focus: [
        "Make the central-fat cluster your primary focus — glucose, waist-to-hip ratio and visceral fat move together, so a lower-glycemic, higher-fibre approach (especially at breakfast) is the highest-leverage lever you have and speaks directly to your longevity goal.",
        "Add one weekly resistance session on top of your existing cardio — for a metabolically-drifting 58-year-old this is one of the most consistently supported ways to bring down waist-to-hip ratio and visceral fat over time.",
        "Trim alcohol toward the lower end of your current 1-7 drinks a week — it feeds both the glucose and the visceral-fat pattern, so easing off compounds with the dietary change rather than fighting it.",
        "Protect your sleep window deliberately — at 7.4 hours it is already an asset supporting your energy, focus and glucose regulation, and it is the easiest thing to lose first on a heavy travel week.",
        "Keep your cardiovascular base exactly where it is — your vascular numbers reflect it and it is squarely on your fitness goal, so this is about maintenance, not more.",
      ],
      discussion_points: [
        "Ask about rechecking fasting glucose and HbA1c together in three to six months to see whether the dietary and activity changes are actually moving the trend, rather than guessing.",
        "Discuss whether your weekly activity mix should tilt from mostly cardio toward more resistance training, given that the central-fat pattern responds best to added strength work.",
        "Explore whether a short spell wearing a continuous glucose monitor would show which specific meals are spiking your glucose — targeted data beats general dietary advice for someone with your profile.",
        "Raise any family history relevant to metabolic and cardiovascular health, since that context sits outside this data and would sharpen how closely the central-fat cluster is worth watching.",
      ],
      care_plan: {
        nutrition: [
          { title: "Rebuild breakfast around fibre and protein", detail: "Lower the glycemic load where your glucose drifts most." },
          { title: "Anchor meals to a steady window", detail: "Avoid skipping then over-compensating later in the day." },
          { title: "Ease alcohol toward the low end", detail: "It feeds both the glucose and visceral-fat pattern." },
        ],
        exercise: [
          { title: "Add one resistance session weekly", detail: "The most reliable lever on visceral fat and waist ratio." },
          { title: "Protect your cardio base", detail: "It is already delivering your strong vascular numbers." },
          { title: "Add a short post-meal walk", detail: "A simple, effective way to blunt glucose spikes." },
        ],
        medications: [
          { title: "Continue your current supplement base", detail: "Omega-3, Vitamin D and Magnesium suit your profile." },
          { title: "Discuss a follow-up metabolic panel", detail: "Timed to check whether the glucose trend is moving." },
        ],
        sleep: [
          { title: "Guard your 7-9 hour window", detail: "It is quietly protecting cognition, heart rate and glucose." },
          { title: "Hold the routine on travel days", detail: "That is when your sleep quality slips first." },
        ],
        mindfulness: [
          { title: "Keep a short daily wind-down", detail: "Your stress index is in range but in the upper half." },
          { title: "Build in a midday reset", detail: "Stress and glucose regulation are closely linked for you." },
        ],
      },
      generated_at: nowIso(),
      edited_by_admin: false,
      missing_biomarkers: computeMissingBiomarkers(jamesBiomarkers),
      out_of_range: computeOutOfRange(jamesBiomarkers),
    });

    // Seven days of daily-tracking history for James Chen (today + the six days before).
    const jamesDailyLogs: Array<Omit<DailyLog, "id" | "participant_id">> = [
      { log_date: daysAgo(6), sleep: { hours: 7.5, quality: 78 }, activity: { type: "Walk", duration_minutes: 30 }, mood: { score: 7 }, food: { meals: 3 }, weight_kg: 82.3, supplements: ["Omega-3", "Vitamin D"], notes: null },
      { log_date: daysAgo(5), sleep: { hours: 7.0, quality: 72 }, activity: { type: "Gym", duration_minutes: 45 }, mood: { score: 6 }, food: { meals: 3 }, weight_kg: 82.1, supplements: ["Omega-3"], notes: null },
      { log_date: daysAgo(4), sleep: { hours: 6.5, quality: 65 }, activity: { type: "Rest", duration_minutes: 0 }, mood: { score: 5 }, food: { meals: 2 }, weight_kg: 82.2, supplements: ["Vitamin D", "Magnesium"], notes: "Busy travel day" },
      { log_date: daysAgo(3), sleep: { hours: 8.0, quality: 85 }, activity: { type: "Run", duration_minutes: 35 }, mood: { score: 8 }, food: { meals: 3 }, weight_kg: 81.9, supplements: ["Omega-3", "Vitamin D", "Magnesium"], notes: null },
      { log_date: daysAgo(2), sleep: { hours: 7.8, quality: 88 }, activity: { type: "Gym", duration_minutes: 50 }, mood: { score: 8 }, food: { meals: 3 }, weight_kg: 81.8, supplements: ["Omega-3", "Vitamin D"], notes: null },
      { log_date: daysAgo(1), sleep: { hours: 7.2, quality: 75 }, activity: { type: "Walk", duration_minutes: 20 }, mood: { score: 6 }, food: { meals: 2 }, weight_kg: 82.0, supplements: ["Omega-3"], notes: null },
      { log_date: daysAgo(0), sleep: { hours: 7.4, quality: 80 }, activity: { type: "Yoga", duration_minutes: 25 }, mood: { score: 7 }, food: { meals: 1 }, weight_kg: 82.0, supplements: ["Omega-3", "Vitamin D"], notes: null },
    ];
    for (const log of jamesDailyLogs) {
      this.dailyLogs.set(`${james.id}:${log.log_date}`, { id: `dl-${james.id}-${log.log_date}`, participant_id: james.id, ...log });
    }

    OTHER_NAMES.forEach((person, idx) => {
      const id = slugify(person.name);
      const participant: Participant = {
        id,
        name: person.name,
        age: person.age,
        sex: person.sex,
        height_cm: 160 + Math.floor(mulberry32(idx * 3 + 1)() * 30),
        weight_kg: 60 + Math.floor(mulberry32(idx * 5 + 2)() * 35),
        goals: [pick(GOALS_POOL, mulberry32(idx * 7 + 3)()), pick(GOALS_POOL, mulberry32(idx * 11 + 4)())],
        consent_given: true,
        consented_at: nowIso(),
        created_at: nowIso(),
      };
      this.participants.set(id, participant);
      this.reviews.set(id, []);
      this.files.set(id, []);

      const state = OTHER_STATES[idx];
      const pastAiDraft = state !== "capturing";

      for (const channel of CHANNELS) {
        this.captureChannels.set(`${id}:${channel}`, {
          id: `cc-${id}-${channel}`,
          participant_id: id,
          channel,
          status: pastAiDraft ? "complete" : mulberry32(idx * 13 + 5)() > 0.5 ? "complete" : "partial",
          entered_by: mulberry32(idx * 17 + 6)() > 0.5 ? "participant" : "admin",
          updated_at: nowIso(),
        });
      }

      const scores: PillarScores = {
        vascular: 55 + Math.floor(mulberry32(idx * 19 + 7)() * 40),
        metabolic: 55 + Math.floor(mulberry32(idx * 23 + 8)() * 40),
        mental: 55 + Math.floor(mulberry32(idx * 29 + 9)() * 40),
      };

      const participantBiomarkers: Biomarker[] = [];
      for (const pillar of PILLARS) {
        for (const bm of genBiomarkersForScore(id, pillar, scores[pillar], idx * 31 + PILLARS.indexOf(pillar), participant.sex)) {
          this.biomarkers.set(bm.id, bm);
          participantBiomarkers.push(bm);
        }
      }

      if (pastAiDraft) {
        const bioAgeOffset = Math.floor(mulberry32(idx * 37 + 10)() * 8) - 2;
        this.aiDrafts.set(id, genAiDraftForScores(id, participant, scores, bioAgeOffset, person.age, participantBiomarkers));
      }

      const needsAttention = ATTENTION_INDEXES.has(idx);
      this.pipelines.set(id, {
        participant_id: id,
        state,
        needs_attention: needsAttention,
        attention_reason: needsAttention ? pick(["Incomplete lab upload", "Wearable sync failed", "Missing body composition scan"], mulberry32(idx * 41 + 11)()) : null,
        delivered_at: state === "delivered" ? nowIso() : null,
      });
      // Everyone past "capturing" already finished onboarding; the one demo row
      // still "capturing" starts the sub-flow fresh, same as a brand-new sign-up.
      this.onboardingProgress.set(
        id,
        state === "capturing" ? freshOnboardingProgress(id) : completeOnboardingProgress(id)
      );

      // "gp_review" rows vary in which stage(s) are already signed (see
      // GP_REVIEW_SIGNED_STAGES); "signed"/"delivered" always have both.
      const gpReviewIndex = OTHER_STATES.slice(0, idx).filter((s) => s === "gp_review").length;
      const signedStages: ReviewStage[] =
        state === "gp_review"
          ? GP_REVIEW_SIGNED_STAGES[gpReviewIndex] ?? []
          : state === "signed" || state === "delivered"
          ? ["gp", "tcm"]
          : [];
      if (signedStages.includes("gp")) {
        this.reviews.get(id)!.push({
          id: `rv-${id}-gp`,
          participant_id: id,
          stage: "gp",
          reviewer_name: "Dr. Helena Marsh",
          reviewer_credential: "MBBS, General Practice",
          notes: "Reviewed capture data; consistent with AI draft.",
          signed_at: nowIso(),
        });
      }
      if (signedStages.includes("tcm")) {
        this.reviews.get(id)!.push({
          id: `rv-${id}-tcm`,
          participant_id: id,
          stage: "tcm",
          reviewer_name: "Dr. Wei Lin",
          reviewer_credential: "TCM Practitioner, Licensed",
          notes: "Concur with GP assessment.",
          signed_at: nowIso(),
        });
      }
    });
  }

  async listParticipants(): Promise<ParticipantSummary[]> {
    const summaries: ParticipantSummary[] = [];
    for (const participant of this.participants.values()) {
      const pipeline = this.pipelines.get(participant.id)!;
      const channels = CHANNELS.map((c) => this.captureChannels.get(`${participant.id}:${c}`));
      const completion =
        channels.reduce((sum, c) => sum + (c?.status === "complete" ? 1 : c?.status === "partial" ? 0.5 : 0), 0) /
        CHANNELS.length;
      const reviews = this.reviews.get(participant.id) ?? [];
      const gpSigned = reviews.some((r) => r.stage === "gp" && r.signed_at);
      const tcmSigned = reviews.some((r) => r.stage === "tcm" && r.signed_at);
      summaries.push({
        participant,
        pipeline,
        captureCompletionPct: Math.round(completion * 100),
        gpSigned,
        tcmSigned,
      });
    }
    summaries.sort((a, b) => {
      if (a.participant.id === DEMO_PARTICIPANT_ID) return -1;
      if (b.participant.id === DEMO_PARTICIPANT_ID) return 1;
      return a.participant.name.localeCompare(b.participant.name);
    });
    return summaries;
  }

  async getParticipant(id: string): Promise<Participant | null> {
    return this.participants.get(id) ?? null;
  }

  async updateParticipant(id: string, patch: Partial<Participant>): Promise<Participant> {
    const existing = this.participants.get(id);
    if (!existing) throw new Error(`Unknown participant ${id}`);
    const updated: Participant = { ...existing, ...patch };
    this.participants.set(id, updated);
    this.notify();
    return updated;
  }

  async withdrawConsent(participantId: string): Promise<void> {
    const existing = this.participants.get(participantId);
    if (!existing) throw new Error(`Unknown participant ${participantId}`);
    this.participants.set(participantId, {
      ...existing,
      consent_given: false,
      consent_withdrawn_at: nowIso(),
    });
    this.notify();
  }

  async getCaptureChannels(participantId: string): Promise<CaptureChannel[]> {
    return CHANNELS.map((c) => this.captureChannels.get(`${participantId}:${c}`)).filter(
      (c): c is CaptureChannel => Boolean(c)
    );
  }

  async updateCaptureChannel(
    participantId: string,
    channel: CaptureChannelName,
    patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
  ): Promise<CaptureChannel> {
    const key = `${participantId}:${channel}`;
    const existing = this.captureChannels.get(key);
    if (!existing) throw new Error(`Unknown capture channel ${channel} for ${participantId}`);
    const updated: CaptureChannel = { ...existing, ...patch, updated_at: nowIso() };
    this.captureChannels.set(key, updated);
    this.notify();
    return updated;
  }

  async submitCapture(participantId: string): Promise<Pipeline> {
    const pipeline = this.pipelines.get(participantId);
    if (!pipeline) throw new Error(`Unknown participant ${participantId}`);
    if (pipeline.state !== "capturing") {
      throw new Error("Capture has already been submitted for this participant.");
    }
    const channels = await this.getCaptureChannels(participantId);
    // Only the questionnaire (manual) gates submission; ReCOGnAIze and every
    // upload are optional enrichment. Kept in sync with the submit_capture RPC
    // (supabase/migrations/0012) per CLAUDE.md rule #3.
    if (channels.some((c) => c.channel === "manual" && c.status !== "complete")) {
      throw new Error("Please finish the questionnaire before submitting.");
    }
    const draft = this.pendingAiDrafts.get(participantId);
    if (draft) {
      this.aiDrafts.set(participantId, { ...draft, generated_at: nowIso() });
      this.pendingAiDrafts.delete(participantId);
    }
    const updated: Pipeline = { ...pipeline, state: "gp_review" };
    this.pipelines.set(participantId, updated);
    this.notify();
    return updated;
  }

  async getOnboardingProgress(participantId: string): Promise<OnboardingProgress> {
    const existing = this.onboardingProgress.get(participantId);
    if (existing) return existing;
    const fresh = freshOnboardingProgress(participantId);
    this.onboardingProgress.set(participantId, fresh);
    return fresh;
  }

  async updateSectionStatus(
    participantId: string,
    section: OnboardingSectionKey,
    status: OnboardingSectionStatus
  ): Promise<OnboardingProgress> {
    const current = await this.getOnboardingProgress(participantId);
    if (!current.unlocked.includes(section)) {
      throw new Error(`${section} is locked for ${participantId}`);
    }
    const sections = { ...current.sections, [section]: status };
    const updated: OnboardingProgress = {
      participant_id: participantId,
      sections,
      unlocked: computeUnlockedSections(sections),
    };
    this.onboardingProgress.set(participantId, updated);
    this.notify();
    return updated;
  }

  async getBiomarkers(participantId: string): Promise<Biomarker[]> {
    return Array.from(this.biomarkers.values())
      .filter((b) => b.participant_id === participantId)
      .sort((a, b) => PILLARS.indexOf(a.pillar) - PILLARS.indexOf(b.pillar) || a.label.localeCompare(b.label));
  }

  async updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker> {
    const existing = this.biomarkers.get(id);
    if (!existing) throw new Error(`Unknown biomarker ${id}`);
    const merged = { ...existing, ...patch };
    // Re-derive flagged from the corrected value rather than trusting the
    // old flag -- markerScore() (lib/ai/scoring.ts) reads flagged, not the
    // raw value, so a stale flag after an edit silently keeps scoring the
    // pre-correction reading.
    const flagged =
      merged.value !== null && merged.ref_low !== null && merged.ref_high !== null
        ? isMarkerFlagged(merged.key, merged.value, merged.ref_low, merged.ref_high)
        : merged.flagged;
    const updated: Biomarker = { ...merged, flagged, updated_at: nowIso() };
    this.biomarkers.set(id, updated);

    // Scores and biological age are a deterministic function of biomarkers,
    // not an AI call -- recompute them immediately so a reviewer who
    // corrects a value sees it reflected right away, instead of a stale
    // number sitting there until someone remembers to regenerate the draft.
    const draft = this.aiDrafts.get(updated.participant_id);
    if (draft) {
      // Don't rewrite scores a clinician has signed (mirrors the guard in
      // resyncDraftScores / SupabaseRepository): once signed/delivered or either
      // review is signed, a post-sign-off correction leaves the signed draft frozen.
      const state = this.pipelines.get(updated.participant_id)?.state;
      const hasSignedReview = (this.reviews.get(updated.participant_id) ?? []).some((r) => r.signed_at);
      const locked = state === "signed" || state === "delivered" || hasSignedReview;
      if (!locked) {
        const allBiomarkers = await this.getBiomarkers(updated.participant_id);
        const scores = computePillarScores(allBiomarkers);
        const biological_age =
          computePhenoAge(allBiomarkers, draft.chronological_age) ?? computeBiologicalAge(scores, draft.chronological_age);
        this.aiDrafts.set(updated.participant_id, { ...draft, scores, biological_age });
      }
    }

    this.notify();
    return updated;
  }

  async listBiomarkerHistory(participantId: string): Promise<BiomarkerReading[]> {
    return Array.from(this.biomarkerReadings.values())
      .filter((r) => r.participant_id === participantId)
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  }

  async getAiDraft(participantId: string): Promise<AiDraft | null> {
    return this.aiDrafts.get(participantId) ?? null;
  }

  async updateAiDraft(participantId: string, patch: Partial<AiDraft>): Promise<AiDraft> {
    const existing = this.aiDrafts.get(participantId);
    if (!existing) throw new Error(`No AI draft exists yet for ${participantId}`);
    const updated: AiDraft = { ...existing, ...patch, edited_by_admin: true };
    this.aiDrafts.set(participantId, updated);
    this.notify();
    return updated;
  }

  async getReviews(participantId: string): Promise<Review[]> {
    return this.reviews.get(participantId) ?? [];
  }

  async signOff(
    participantId: string,
    stage: ReviewStage,
    data: { reviewer_name: string; reviewer_credential: string; notes: string }
  ): Promise<Review> {
    const pipeline = this.pipelines.get(participantId);
    if (!pipeline) throw new Error(`Unknown participant ${participantId}`);

    // GP and TCM sign off independently, in either order -- both are open
    // any time the pipeline is in this review phase. "gp_review" now means
    // "awaiting one or both signatures", not "GP's turn only".
    if (pipeline.state !== "gp_review") {
      throw new Error("Sign-off is not available at this stage.");
    }

    const review: Review = {
      id: `rv-${participantId}-${stage}`,
      participant_id: participantId,
      stage,
      reviewer_name: data.reviewer_name,
      reviewer_credential: data.reviewer_credential,
      notes: data.notes,
      signed_at: nowIso(),
    };
    const list = this.reviews.get(participantId) ?? [];
    const updatedReviews = [...list.filter((r) => r.stage !== stage), review];
    this.reviews.set(participantId, updatedReviews);

    const bothSigned =
      updatedReviews.some((r) => r.stage === "gp" && r.signed_at) &&
      updatedReviews.some((r) => r.stage === "tcm" && r.signed_at);
    const nextState: PipelineState = bothSigned ? "signed" : "gp_review";
    this.pipelines.set(participantId, { ...pipeline, state: nextState });
    this.notify();

    return review;
  }

  async getPipeline(participantId: string): Promise<Pipeline | null> {
    return this.pipelines.get(participantId) ?? null;
  }

  async releaseCard(participantId: string): Promise<Pipeline> {
    const pipeline = this.pipelines.get(participantId);
    if (!pipeline) throw new Error(`Unknown participant ${participantId}`);
    if (pipeline.state !== "signed") {
      throw new Error("Release is locked until both GP and TCM sign-off are complete.");
    }
    const updated: Pipeline = { ...pipeline, state: "delivered", delivered_at: nowIso() };
    this.pipelines.set(participantId, updated);
    this.notify();
    return updated;
  }

  async resolveAttention(participantId: string): Promise<Pipeline> {
    const pipeline = this.pipelines.get(participantId);
    if (!pipeline) throw new Error(`Unknown participant ${participantId}`);
    const updated: Pipeline = { ...pipeline, needs_attention: false, attention_reason: null };
    this.pipelines.set(participantId, updated);
    this.notify();
    return updated;
  }

  async getSignedCard(participantId: string): Promise<SignedCard | null> {
    const pipeline = this.pipelines.get(participantId);
    if (!pipeline || pipeline.state !== "delivered") return null;
    const participant = this.participants.get(participantId);
    const aiDraft = this.aiDrafts.get(participantId);
    if (!participant || !aiDraft) return null;
    return {
      participant,
      aiDraft,
      biomarkers: await this.getBiomarkers(participantId),
      reviews: await this.getReviews(participantId),
    };
  }

  async listFiles(participantId: string): Promise<FileRecord[]> {
    return this.files.get(participantId) ?? [];
  }

  async listWearableConnections(): Promise<WearableConnection[]> {
    // Mock mode has no Terra backend.
    return [];
  }

  async uploadFile(
    participantId: string,
    kind: FileKind,
    file: { filename: string }
  ): Promise<FileRecord> {
    const existing = this.files.get(participantId) ?? [];
    const record: FileRecord = {
      id: `file-${participantId}-${existing.length}`,
      participant_id: participantId,
      kind,
      storage_path: `mock://${participantId}/${file.filename}`,
      extracted: false,
    };
    this.files.set(participantId, [...existing, record]);
    this.notify();
    return record;
  }

  async getFileUrl(_fileId: string): Promise<string | null> {
    // Mock mode never stores real file bytes anywhere, so there's nothing to view.
    return null;
  }

  async listDailyLogs(participantId: string): Promise<DailyLog[]> {
    return Array.from(this.dailyLogs.values())
      .filter((l) => l.participant_id === participantId)
      .sort((a, b) => a.log_date.localeCompare(b.log_date));
  }

  async upsertDailyLog(
    participantId: string,
    logDate: string,
    patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>
  ): Promise<DailyLog> {
    const key = `${participantId}:${logDate}`;
    const existing = this.dailyLogs.get(key);
    const updated: DailyLog = {
      id: existing?.id ?? `dl-${participantId}-${logDate}`,
      participant_id: participantId,
      log_date: logDate,
      sleep: existing?.sleep ?? null,
      food: existing?.food ?? null,
      mood: existing?.mood ?? null,
      activity: existing?.activity ?? null,
      weight_kg: existing?.weight_kg ?? null,
      supplements: existing?.supplements ?? [],
      notes: existing?.notes ?? null,
      ...patch,
    };
    this.dailyLogs.set(key, updated);
    this.notify();
    return updated;
  }
}

let _repository: Repository | null = null;

/**
 * Real Supabase backend when EXPO_PUBLIC_SUPABASE_URL/ANON_KEY are set (see
 * .env.example); otherwise the in-memory mock, so local dev and demo/preview
 * deploys keep working with zero setup.
 */
export function getRepository(): Repository {
  if (!_repository) {
    _repository = createSupabaseRepository() ?? new MockRepository();
  }
  return _repository;
}

export const repository: Repository = getRepository();
