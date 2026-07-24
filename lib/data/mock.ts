import type {
  AiDraft,
  Biomarker,
  BiomarkerSource,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileKind,
  FileRecord,
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

interface BiomarkerTemplate {
  key: string;
  label: string;
  unit: string;
  ref_low: number;
  ref_high: number;
  source: BiomarkerSource;
  lowerIsBetter?: boolean;
}

const BIOMARKER_TEMPLATES: Record<Pillar, BiomarkerTemplate[]> = {
  vascular: [
    { key: "systolic_bp", label: "Systolic blood pressure", unit: "mmHg", ref_low: 90, ref_high: 120, source: "wearable" },
    { key: "diastolic_bp", label: "Diastolic blood pressure", unit: "mmHg", ref_low: 60, ref_high: 80, source: "wearable" },
    { key: "resting_hr", label: "Resting heart rate", unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable" },
    { key: "hrv", label: "Heart rate variability", unit: "ms", ref_low: 40, ref_high: 70, source: "wearable" },
    { key: "total_cholesterol", label: "Total cholesterol", unit: "mmol/L", ref_low: 2.5, ref_high: 5.2, source: "lab_extract", lowerIsBetter: true },
    { key: "ldl_c", label: "LDL cholesterol", unit: "mmol/L", ref_low: 1.0, ref_high: 3.0, source: "lab_extract", lowerIsBetter: true },
    { key: "hdl_c", label: "HDL cholesterol", unit: "mmol/L", ref_low: 1.0, ref_high: 2.5, source: "lab_extract" },
    { key: "hscrp", label: "hs-CRP", unit: "mg/L", ref_low: 0, ref_high: 3.0, source: "lab_extract", lowerIsBetter: true },
  ],
  metabolic: [
    { key: "fasting_glucose", label: "Fasting glucose", unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract" },
    { key: "hba1c", label: "HbA1c", unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract" },
    { key: "waist_hip_ratio", label: "Waist-to-hip ratio", unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp" },
    { key: "bmi", label: "BMI", unit: "kg/m²", ref_low: 18.5, ref_high: 25, source: "body_comp" },
    { key: "body_fat_pct", label: "Body fat %", unit: "%", ref_low: 8, ref_high: 25, source: "body_comp" },
    { key: "visceral_fat", label: "Visceral fat", unit: "level", ref_low: 1, ref_high: 12, source: "body_comp", lowerIsBetter: true },
    { key: "vitamin_d", label: "Vitamin D", unit: "nmol/L", ref_low: 50, ref_high: 125, source: "lab_extract" },
  ],
  mental: [
    { key: "reaction_time", label: "Cognitive reaction time", unit: "ms", ref_low: 250, ref_high: 400, source: "recognize", lowerIsBetter: true },
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

function genBiomarkersForScore(participantId: string, pillar: Pillar, score: number, seed: number): Biomarker[] {
  const templates = BIOMARKER_TEMPLATES[pillar];
  return templates.map((t, i) => {
    const r = mulberry32(seed + i * 17)();
    const span = t.ref_high - t.ref_low;
    const center = t.lowerIsBetter ? t.ref_low + span * (1 - score / 100) : t.ref_low + span * (score / 100);
    const jitter = (r - 0.5) * span * 0.3;
    const value = Math.round((center + jitter) * 100) / 100;
    const flagged = value < t.ref_low || value > t.ref_high;
    return {
      id: `bm-${participantId}-${t.key}`,
      participant_id: participantId,
      pillar,
      key: t.key,
      label: t.label,
      value,
      unit: t.unit,
      ref_low: t.ref_low,
      ref_high: t.ref_high,
      source: t.source,
      status: t.source === "lab_extract" ? "extracted" : t.source === "wearable" ? "imported" : "entered",
      flagged,
      updated_at: nowIso(),
    } as Biomarker;
  });
}

function computeOutOfRange(biomarkers: Biomarker[]): OutOfRangeBiomarker[] {
  return biomarkers
    .filter((b) => b.flagged && b.value !== null && b.ref_high !== null)
    .map((b) => ({ key: b.key, value: b.value as number, ref_high: b.ref_high as number }));
}

function computeMissingBiomarkers(biomarkers: Biomarker[]): string[] {
  return biomarkers.filter((b) => b.value === null).map((b) => b.key);
}

function genAiDraftForScores(
  participantId: string,
  _name: string,
  scores: PillarScores,
  bioAgeOffset: number,
  chronologicalAge: number,
  biomarkers: Biomarker[]
): AiDraft {
  const entries = Object.entries(scores) as [Pillar, number][];
  const weakest = entries.slice().sort((a, b) => a[1] - b[1])[0];
  const strongest = entries.slice().sort((a, b) => b[1] - a[1])[0];
  const monitorPillar = weakest[1] < 70 ? weakest[0] : null;

  const pillarLabel: Record<Pillar, string> = {
    vascular: "vascular",
    metabolic: "metabolic",
    mental: "mental",
  };

  return {
    id: `draft-${participantId}`,
    participant_id: participantId,
    scores,
    biological_age: Math.max(18, chronologicalAge - bioAgeOffset),
    chronological_age: chronologicalAge,
    key_contributors: [
      monitorPillar
        ? { text: `${pillarLabel[monitorPillar]} markers are trending outside the optimal range`, tone: "monitor" as const }
        : { text: `${pillarLabel[weakest[0]]} markers are within the optimal range`, tone: "good" as const },
      { text: `${pillarLabel[strongest[0]]} health reflects strong overall condition for age`, tone: "good" as const },
      { text: "Overall wellness trend is stable across the last capture cycle", tone: "good" as const },
    ],
    strengths: [`Strong ${pillarLabel[strongest[0]]} health for age`, "Consistent capture across all channels"],
    areas_to_monitor: monitorPillar ? [`${pillarLabel[monitorPillar]} markers trending toward the reference boundary`] : [],
    suggested_focus: ["Daily movement", "Sleep consistency", "Stress management", "Nutrition timing"],
    discussion_points: [
      `Review ${pillarLabel[weakest[0]]} trend at the next check-in`,
      "Discuss current recovery and stress load",
    ],
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
  ...Array(4).fill("gp_review"),
  ...Array(4).fill("tcm_review"),
  "ai_drafted",
  "capturing",
];

const ATTENTION_INDEXES = new Set([2, 7, 13]);

const GOALS_POOL = ["Longevity", "Energy & focus", "Weight management", "Stress resilience", "Sleep quality", "Cardiovascular fitness"];

class MockRepository implements Repository {
  private participants = new Map<string, Participant>();
  private captureChannels = new Map<string, CaptureChannel>();
  private biomarkers = new Map<string, Biomarker>();
  private aiDrafts = new Map<string, AiDraft>();
  private pendingAiDrafts = new Map<string, AiDraft>();
  private reviews = new Map<string, Review[]>();
  private pipelines = new Map<string, Pipeline>();
  private files = new Map<string, FileRecord[]>();
  private dailyLogs = new Map<string, DailyLog>(); // key: `${participantId}:${log_date}`
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

    const jamesBiomarkers: Biomarker[] = [
      // Vascular — Good (74): all core + expanded markers in range.
      { id: "bm-james-chen-systolic_bp", participant_id: james.id, pillar: "vascular", key: "systolic_bp", label: "Systolic blood pressure", value: 118, unit: "mmHg", ref_low: 90, ref_high: 120, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-diastolic_bp", participant_id: james.id, pillar: "vascular", key: "diastolic_bp", label: "Diastolic blood pressure", value: 76, unit: "mmHg", ref_low: 60, ref_high: 80, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-resting_hr", participant_id: james.id, pillar: "vascular", key: "resting_hr", label: "Resting heart rate", value: 58, unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hrv", participant_id: james.id, pillar: "vascular", key: "hrv", label: "Heart rate variability", value: 62, unit: "ms", ref_low: 40, ref_high: 70, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-total_cholesterol", participant_id: james.id, pillar: "vascular", key: "total_cholesterol", label: "Total cholesterol", value: 4.9, unit: "mmol/L", ref_low: 2.5, ref_high: 5.2, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-ldl_c", participant_id: james.id, pillar: "vascular", key: "ldl_c", label: "LDL cholesterol", value: 2.6, unit: "mmol/L", ref_low: 1.0, ref_high: 3.0, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hdl_c", participant_id: james.id, pillar: "vascular", key: "hdl_c", label: "HDL cholesterol", value: 1.4, unit: "mmol/L", ref_low: 1.0, ref_high: 2.5, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hscrp", participant_id: james.id, pillar: "vascular", key: "hscrp", label: "hs-CRP", value: 1.2, unit: "mg/L", ref_low: 0, ref_high: 3.0, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },

      // Metabolic — Monitor (68): glucose + waist-hip already flagged; BMI and visceral fat
      // reinforce the same "monitor" story rather than contradict it.
      { id: "bm-james-chen-fasting_glucose", participant_id: james.id, pillar: "metabolic", key: "fasting_glucose", label: "Fasting glucose", value: 108, unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract", status: "needs_review", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-hba1c", participant_id: james.id, pillar: "metabolic", key: "hba1c", label: "HbA1c", value: 5.6, unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-waist_hip_ratio", participant_id: james.id, pillar: "metabolic", key: "waist_hip_ratio", label: "Waist-to-hip ratio", value: 0.93, unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-bmi", participant_id: james.id, pillar: "metabolic", key: "bmi", label: "BMI", value: 26.1, unit: "kg/m²", ref_low: 18.5, ref_high: 25, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-body_fat_pct", participant_id: james.id, pillar: "metabolic", key: "body_fat_pct", label: "Body fat %", value: 24, unit: "%", ref_low: 8, ref_high: 25, source: "body_comp", status: "entered", flagged: false, updated_at: nowIso() },
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

    this.pendingAiDrafts.set(james.id, {
      id: "draft-james-chen",
      participant_id: james.id,
      scores: { vascular: 74, metabolic: 68, mental: 81 },
      biological_age: 54,
      chronological_age: 58,
      key_contributors: [
        { text: "Fasting glucose is trending above the optimal range", tone: "monitor" },
        { text: "Resting heart rate and HRV reflect strong cardiovascular fitness", tone: "good" },
        { text: "Cognitive reaction time is well above the age-matched average", tone: "good" },
      ],
      strengths: [
        "Excellent cardiovascular fitness for age",
        "Strong cognitive processing speed",
        "Consistent sleep schedule",
      ],
      areas_to_monitor: [
        "Fasting glucose trending toward the upper reference range",
        "Waist-to-hip ratio slightly above target",
      ],
      suggested_focus: ["Daily movement", "Sleep consistency", "Stress management", "Nutrition timing"],
      discussion_points: [
        "Ask about a follow-up fasting glucose recheck in 3 months",
        "Discuss current stress load and recovery practices",
        "Review family history relevant to metabolic health",
      ],
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
        for (const bm of genBiomarkersForScore(id, pillar, scores[pillar], idx * 31 + PILLARS.indexOf(pillar))) {
          this.biomarkers.set(bm.id, bm);
          participantBiomarkers.push(bm);
        }
      }

      if (pastAiDraft) {
        const bioAgeOffset = Math.floor(mulberry32(idx * 37 + 10)() * 8) - 2;
        this.aiDrafts.set(id, genAiDraftForScores(id, person.name, scores, bioAgeOffset, person.age, participantBiomarkers));
      }

      const needsAttention = ATTENTION_INDEXES.has(idx);
      this.pipelines.set(id, {
        participant_id: id,
        state,
        needs_attention: needsAttention,
        attention_reason: needsAttention ? pick(["Incomplete lab upload", "Wearable sync failed", "Missing body composition scan"], mulberry32(idx * 41 + 11)()) : null,
        delivered_at: state === "delivered" ? nowIso() : null,
      });

      if (state === "gp_review" || state === "tcm_review" || state === "signed" || state === "delivered") {
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
      if (state === "tcm_review" || state === "signed" || state === "delivered") {
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
      summaries.push({ participant, pipeline, captureCompletionPct: Math.round(completion * 100) });
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
    if (channels.some((c) => c.status !== "complete")) {
      throw new Error("All capture channels must be complete before submitting.");
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

  async getBiomarkers(participantId: string): Promise<Biomarker[]> {
    return Array.from(this.biomarkers.values())
      .filter((b) => b.participant_id === participantId)
      .sort((a, b) => PILLARS.indexOf(a.pillar) - PILLARS.indexOf(b.pillar) || a.label.localeCompare(b.label));
  }

  async updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker> {
    const existing = this.biomarkers.get(id);
    if (!existing) throw new Error(`Unknown biomarker ${id}`);
    const updated: Biomarker = { ...existing, ...patch, updated_at: nowIso() };
    this.biomarkers.set(id, updated);
    this.notify();
    return updated;
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

    if (stage === "gp" && pipeline.state !== "gp_review") {
      throw new Error("GP sign-off is not available at this stage.");
    }
    if (stage === "tcm" && pipeline.state !== "tcm_review") {
      throw new Error("TCM sign-off is locked until GP sign-off is complete.");
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
    this.reviews.set(participantId, [...list.filter((r) => r.stage !== stage), review]);

    const nextState: PipelineState = stage === "gp" ? "tcm_review" : "signed";
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
