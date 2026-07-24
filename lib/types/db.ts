// CHANGE LOG (newest first)
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
  updated_at: string;
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
