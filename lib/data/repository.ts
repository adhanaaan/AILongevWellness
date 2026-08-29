import type {
  AiDraft,
  Biomarker,
  BiomarkerReading,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileKind,
  FileRecord,
  WearableConnection,
  OnboardingProgress,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  Participant,
  ParticipantSummary,
  Pipeline,
  Review,
  ReviewStage,
} from "../types/db";

export interface UploadableFile {
  blob: Blob;
  filename: string;
  contentType?: string;
}

export interface SignedCard {
  participant: Participant;
  aiDraft: AiDraft;
  biomarkers: Biomarker[];
  reviews: Review[];
}

export interface Repository {
  /** Registers a listener called on any data change; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;

  listParticipants(): Promise<ParticipantSummary[]>;
  getParticipant(id: string): Promise<Participant | null>;
  updateParticipant(id: string, patch: Partial<Participant>): Promise<Participant>;
  /** Withdraw consent. Goes through a server RPC (real backend) so the consent
   *  columns stay non-forgeable; a direct participant write to them is blocked. */
  withdrawConsent(participantId: string): Promise<void>;

  getCaptureChannels(participantId: string): Promise<CaptureChannel[]>;
  updateCaptureChannel(
    participantId: string,
    channel: CaptureChannelName,
    patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
  ): Promise<CaptureChannel>;
  submitCapture(participantId: string): Promise<Pipeline>;

  getOnboardingProgress(participantId: string): Promise<OnboardingProgress>;
  updateSectionStatus(
    participantId: string,
    section: OnboardingSectionKey,
    status: OnboardingSectionStatus
  ): Promise<OnboardingProgress>;

  getBiomarkers(participantId: string): Promise<Biomarker[]>;
  updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker>;
  /**
   * Create or replace a biomarker by (participant, key) — for care-team manual
   * entry (e.g. a blood-pressure reading). Resolves label/unit/reference range
   * from the catalog and re-derives scores, same as an extracted value.
   */
  upsertBiomarker(participantId: string, key: string, value: number): Promise<Biomarker>;
  /** Every historical reading ever recorded, oldest first -- not just the current snapshot getBiomarkers returns. */
  listBiomarkerHistory(participantId: string): Promise<BiomarkerReading[]>;

  getAiDraft(participantId: string): Promise<AiDraft | null>;
  updateAiDraft(participantId: string, patch: Partial<AiDraft>): Promise<AiDraft>;

  getReviews(participantId: string): Promise<Review[]>;
  signOff(
    participantId: string,
    stage: ReviewStage,
    data: { reviewer_name: string; reviewer_credential: string; notes: string }
  ): Promise<Review>;

  getPipeline(participantId: string): Promise<Pipeline | null>;
  releaseCard(participantId: string): Promise<Pipeline>;
  resolveAttention(participantId: string): Promise<Pipeline>;

  getSignedCard(participantId: string): Promise<SignedCard | null>;

  listFiles(participantId: string): Promise<FileRecord[]>;
  uploadFile(
    participantId: string,
    kind: FileKind,
    file: UploadableFile
  ): Promise<FileRecord>;
  /** A short-lived signed URL to view/download the raw uploaded file. Null if unavailable (e.g. mock mode has no real file storage). */
  getFileUrl(fileId: string): Promise<string | null>;

  /** Wearable providers the participant has connected via Terra (empty in mock mode). */
  listWearableConnections(participantId: string): Promise<WearableConnection[]>;

  listDailyLogs(participantId: string): Promise<DailyLog[]>;
  upsertDailyLog(
    participantId: string,
    logDate: string,
    patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>
  ): Promise<DailyLog>;
}
