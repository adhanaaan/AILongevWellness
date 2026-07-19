import type {
  AiDraft,
  Biomarker,
  BiomarkerSource,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  EnteredBy,
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

export const DEMO_PARTICIPANT_ID = "james-chen";

function nowIso(): string {
  return new Date().toISOString();
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
    { key: "resting_hr", label: "Resting heart rate", unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable" },
    { key: "hrv", label: "Heart rate variability", unit: "ms", ref_low: 40, ref_high: 70, source: "wearable" },
  ],
  metabolic: [
    { key: "fasting_glucose", label: "Fasting glucose", unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract" },
    { key: "hba1c", label: "HbA1c", unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract" },
    { key: "waist_hip_ratio", label: "Waist-to-hip ratio", unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp" },
  ],
  mental: [
    { key: "reaction_time", label: "Cognitive reaction time", unit: "ms", ref_low: 250, ref_high: 400, source: "recognize", lowerIsBetter: true },
    { key: "sleep_quality", label: "Sleep quality index", unit: "/100", ref_low: 70, ref_high: 100, source: "wearable" },
    { key: "stress_index", label: "Stress index", unit: "/100", ref_low: 0, ref_high: 40, source: "manual", lowerIsBetter: true },
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
      { id: "bm-james-chen-systolic_bp", participant_id: james.id, pillar: "vascular", key: "systolic_bp", label: "Systolic blood pressure", value: 118, unit: "mmHg", ref_low: 90, ref_high: 120, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-resting_hr", participant_id: james.id, pillar: "vascular", key: "resting_hr", label: "Resting heart rate", value: 58, unit: "bpm", ref_low: 50, ref_high: 80, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-hrv", participant_id: james.id, pillar: "vascular", key: "hrv", label: "Heart rate variability", value: 62, unit: "ms", ref_low: 40, ref_high: 70, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-fasting_glucose", participant_id: james.id, pillar: "metabolic", key: "fasting_glucose", label: "Fasting glucose", value: 108, unit: "mg/dL", ref_low: 70, ref_high: 99, source: "lab_extract", status: "needs_review", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-hba1c", participant_id: james.id, pillar: "metabolic", key: "hba1c", label: "HbA1c", value: 5.6, unit: "%", ref_low: 4.0, ref_high: 5.7, source: "lab_extract", status: "extracted", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-waist_hip_ratio", participant_id: james.id, pillar: "metabolic", key: "waist_hip_ratio", label: "Waist-to-hip ratio", value: 0.93, unit: "ratio", ref_low: 0.7, ref_high: 0.9, source: "body_comp", status: "entered", flagged: true, updated_at: nowIso() },
      { id: "bm-james-chen-reaction_time", participant_id: james.id, pillar: "mental", key: "reaction_time", label: "Cognitive reaction time", value: 320, unit: "ms", ref_low: 250, ref_high: 400, source: "recognize", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-sleep_quality", participant_id: james.id, pillar: "mental", key: "sleep_quality", label: "Sleep quality index", value: 82, unit: "/100", ref_low: 70, ref_high: 100, source: "wearable", status: "imported", flagged: false, updated_at: nowIso() },
      { id: "bm-james-chen-stress_index", participant_id: james.id, pillar: "mental", key: "stress_index", label: "Stress index", value: 34, unit: "/100", ref_low: 0, ref_high: 40, source: "manual", status: "entered", flagged: false, updated_at: nowIso() },
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
}

let _repository: MockRepository | null = null;

export function getRepository(): MockRepository {
  if (!_repository) {
    _repository = new MockRepository();
  }
  return _repository;
}

export const repository = getRepository();
