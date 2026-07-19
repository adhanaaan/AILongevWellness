import type {
  AiDraft,
  Biomarker,
  CaptureChannel,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileRecord,
  Participant,
  ParticipantSummary,
  Pipeline,
  Review,
  ReviewStage,
} from "../types/db";

export interface SignedCard {
  participant: Participant;
  aiDraft: AiDraft;
  biomarkers: Biomarker[];
  reviews: Review[];
}

export interface Repository {
  listParticipants(): Promise<ParticipantSummary[]>;
  getParticipant(id: string): Promise<Participant | null>;
  updateParticipant(id: string, patch: Partial<Participant>): Promise<Participant>;

  getCaptureChannels(participantId: string): Promise<CaptureChannel[]>;
  updateCaptureChannel(
    participantId: string,
    channel: CaptureChannelName,
    patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
  ): Promise<CaptureChannel>;
  submitCapture(participantId: string): Promise<Pipeline>;

  getBiomarkers(participantId: string): Promise<Biomarker[]>;
  updateBiomarker(id: string, patch: Partial<Biomarker>): Promise<Biomarker>;

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

  listDailyLogs(participantId: string): Promise<DailyLog[]>;
  upsertDailyLog(
    participantId: string,
    logDate: string,
    patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>
  ): Promise<DailyLog>;
}
