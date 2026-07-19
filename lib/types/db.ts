// CHANGE LOG (newest first)
// - 2026-07-19 Person 3: Added missing_biomarkers/out_of_range to AiDraft (mock.ts populates them).

export type Sex = "male" | "female" | "other";

export interface Participant {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  goals: string[];
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
