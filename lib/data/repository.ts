import type {
  AiDraft,
  Biomarker,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  EnteredBy,
  FileRecord,
  Participant,
  ParticipantSummary,
  Pipeline,
  Review,
  ReviewStage,
} from "@/lib/types/db";

/**
 * A signed card is the only thing the participant `/card` route and AVA
 * are allowed to read from. It bundles the participant, the (delivered)
 * ai_draft, and the biomarkers that back it — nothing else.
 */
export interface SignedCard {
  participant: Participant;
  aiDraft: AiDraft;
  biomarkers: Biomarker[];
  reviews: Review[];
}

/**
 * All data access for the app goes through this interface. `MockRepository`
 * (lib/data/mock.ts) is the only implementation today; a future
 * `SupabaseRepository` implements the same interface so call sites never
 * change.
 */
export interface Repository {
  // participants
  listParticipants(): Promise<ParticipantSummary[]>;
  getParticipant(id: string): Promise<Participant | null>;
  updateParticipant(id: string, patch: Partial<Participant>): Promise<Participant>;

  // capture
  getCaptureChannels(participantId: string): Promise<CaptureChannel[]>;
  updateCaptureChannel(
    participantId: string,
    channel: CaptureChannelName,
    patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
  ): Promise<CaptureChannel>;
  /** Participant presses "Review my snapshot": generates the AI draft and enters the GP queue. */
  submitCapture(participantId: string): Promise<Pipeline>;

  // biomarkers
  getBiomarkers(participantId: string): Promise<Biomarker[]>;
  updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker>;

  // AI draft
  getAiDraft(participantId: string): Promise<AiDraft | null>;
  updateAiDraft(participantId: string, patch: Partial<AiDraft>): Promise<AiDraft>;

  // reviews / sign-off
  getReviews(participantId: string): Promise<Review[]>;
  signOff(
    participantId: string,
    stage: ReviewStage,
    data: { reviewer_name: string; reviewer_credential: string; notes: string }
  ): Promise<Review>;

  // pipeline
  getPipeline(participantId: string): Promise<Pipeline | null>;
  releaseCard(participantId: string): Promise<Pipeline>;
  resolveAttention(participantId: string): Promise<Pipeline>;

  // the participant-facing signed card (only non-null once delivered)
  getSignedCard(participantId: string): Promise<SignedCard | null>;

  // files
  listFiles(participantId: string): Promise<FileRecord[]>;
}
