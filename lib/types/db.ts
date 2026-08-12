// CHANGE LOG (newest first)
// - 2026-08-11 Added measured_at to Biomarker + BiomarkerReading history type (supabase/migrations/0007_biomarker_history.sql).
// - 2026-08-02 Added care_plan to AiDraft + medications to Participant (supabase/migrations/0004_care_plan.sql).
// - 2026-07-28 Added consent_given/consented_at to Participant (supabase/migrations/0002_consent_tracking.sql).
// - 2026-07-24 Person 1: Added OnboardingProgress (hub-and-spoke capture sub-flow tracking).
// - 2026-07-24 Person 1: Added lifestyle fields (exercise_frequency, smoking, alcohol_drinks_per_week) to Participant.
// - 2026-07-19 Person 3: Added missing_biomarkers/out_of_range to AiDraft (mock.ts populates them).
// - 2026-07-19 Person 2: Added DailyLog type + expanded biomarker coverage (mock.ts).

export type Sex = "male" | "female" | "other";

export type ExerciseFrequency = "rarely" | "sometimes" | "regularly";

export type AlcoholDrinksPerWeek = "none" | "1_to_7" | "8_to_14" | "15_to_21" | "21_plus";

export interface Participant {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  goals: string[];
  exercise_frequency?: ExerciseFrequency;
  smoking?: boolean;
  alcohol_drinks_per_week?: AlcoholDrinksPerWeek;
  consent_given?: boolean;
  consented_at?: string | null;
  /** Self-reported catalog of medications/supplements the participant currently takes (not doctor-prescribed dosing — a wellness platform never prescribes). Daily adherence lives in DailyLog.supplements. */
  medications?: string[];
  created_at: string;
}

export type CaptureChannelName =
  | "manual"
  | "wearables"
  | "body_composition"
  | "lab_report"
  | "recognize";

export type CaptureChannelStatus = "empty" | "partial" | "complete";

export type EnteredBy = "participant" | "admin";

export interface CaptureChannel {
  id: string;
  participant_id: string;
  channel: CaptureChannelName;
  status: CaptureChannelStatus;
  entered_by: EnteredBy | null;
  updated_at: string;
}

export type Pillar = "vascular" | "metabolic" | "mental";

export type BiomarkerSource =
  | "manual"
  | "wearable"
  | "lab_extract"
  | "body_comp"
  | "recognize"
  | "admin";

export type BiomarkerStatus = "entered" | "imported" | "extracted" | "needs_review";

export interface Biomarker {
  id: string;
  participant_id: string;
  pillar: Pillar;
  key: string;
  label: string;
  value: number | null;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  source: BiomarkerSource;
  status: BiomarkerStatus;
  flagged: boolean;
  /** The date this value was actually measured (e.g. the lab's specimen/report date), not when it was uploaded. Null for older rows written before this field existed. */
  measured_at?: string | null;
  updated_at: string;
}

/**
 * One historical reading for a biomarker, kept forever once written -- unlike
 * Biomarker itself (the "current" snapshot scoring reads, one row per key),
 * a participant can have many of these for the same key from different lab
 * report uploads over time. Powers the trend line on the pillar detail page.
 */
export interface BiomarkerReading {
  id: string;
  participant_id: string;
  key: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  source: BiomarkerSource;
  measured_at: string;
  file_id?: string | null;
  created_at: string;
}

export interface PillarScores {
  vascular: number;
  metabolic: number;
  mental: number;
}

export interface KeyContributor {
  text: string;
  tone: "good" | "monitor";
}

export interface OutOfRangeBiomarker {
  key: string;
  value: number;
  ref_high: number;
}

/**
 * The Care Plan tab's five tracks. Each maps onto an existing DailyLog field
 * (nutrition -> food+weight, exercise -> activity, medications -> supplements,
 * sleep -> sleep, mindfulness -> mood), so every category has something concrete
 * for the participant to log against the plan, not just text to read.
 */
export type PlanCategory = "nutrition" | "exercise" | "medications" | "sleep" | "mindfulness";

export type CarePlan = Record<PlanCategory, string[]>;

export interface AiDraft {
  id: string;
  participant_id: string;
  scores: PillarScores;
  biological_age: number;
  chronological_age: number;
  key_contributors: KeyContributor[];
  strengths: string[];
  areas_to_monitor: string[];
  suggested_focus: string[];
  discussion_points: string[];
  /** Doctor-verified, category-tagged action items shown on the Care Plan tab. AI-drafted alongside the rest of the narrative, editable by the reviewer before sign-off. */
  care_plan?: CarePlan;
  generated_at: string;
  edited_by_admin: boolean;
  /** Biomarker keys with no value captured at generation time. */
  missing_biomarkers?: string[];
  /** Biomarkers whose value fell outside its reference range at generation time. */
  out_of_range?: OutOfRangeBiomarker[];
}

export type ReviewStage = "gp" | "tcm";

export interface Review {
  id: string;
  participant_id: string;
  stage: ReviewStage;
  reviewer_name: string;
  reviewer_credential: string;
  notes: string;
  signed_at: string | null;
}

export type PipelineState =
  | "capturing"
  | "ai_drafted"
  | "gp_review"
  | "tcm_review"
  | "signed"
  | "delivered";

export interface Pipeline {
  participant_id: string;
  state: PipelineState;
  needs_attention: boolean;
  attention_reason: string | null;
  delivered_at: string | null;
}

export type FileKind = "lab_report" | "body_comp" | "apple_health_export";

export interface FileRecord {
  id: string;
  participant_id: string;
  kind: FileKind;
  storage_path: string;
  extracted: boolean;
}

export interface ParticipantSummary {
  participant: Participant;
  pipeline: Pipeline;
  captureCompletionPct: number;
  // GP and TCM sign off independently and in either order once the
  // pipeline reaches "gp_review" (which now means "awaiting one or both
  // signatures", not "GP's turn only") -- these let list views show which
  // specific stage(s) are still outstanding without a per-row reviews fetch.
  gpSigned: boolean;
  tcmSigned: boolean;
}

export interface DailyLogSleep {
  hours: number;
  quality: number; // 0-100
}

export interface DailyLogActivity {
  type: string;
  duration_minutes: number;
}

export interface DailyLogMood {
  score: number; // 1-10
}

export interface DailyLogFood {
  meals: number;
  notes?: string;
}

export interface DailyLog {
  id: string;
  participant_id: string;
  log_date: string; // YYYY-MM-DD
  sleep: DailyLogSleep | null;
  food: DailyLogFood | null;
  mood: DailyLogMood | null;
  activity: DailyLogActivity | null;
  weight_kg: number | null;
  supplements: string[];
  notes: string | null;
}

/**
 * Sections of the onboarding "Data Capture" hub-and-spoke sub-flow.
 * personal_info + lifestyle form the fixed, non-skippable "Questionnaire" pair;
 * wearables/body_composition/lab_reports unlock together as a free-order middle
 * trio; recognize is the fixed end, unlocked only once the trio are all done.
 */
export type OnboardingSectionKey =
  | "personal_info"
  | "lifestyle"
  | "wearables"
  | "body_composition"
  | "lab_reports"
  | "recognize";

export type OnboardingSectionStatus = "not_started" | "in_progress" | "done";

export interface OnboardingProgress {
  participant_id: string;
  sections: Record<OnboardingSectionKey, OnboardingSectionStatus>;
  /** Section keys the participant is currently allowed to open. */
  unlocked: OnboardingSectionKey[];
}
