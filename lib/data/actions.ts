import { repository, DEMO_PARTICIPANT_ID } from "./mock";
import type { UploadableFile } from "./repository";
import type {
  AiDraft,
  Biomarker,
  CaptureChannelName,
  CaptureChannelStatus,
  DailyLog,
  EnteredBy,
  FileKind,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  Participant,
  ReviewStage,
} from "../types/db";

export { DEMO_PARTICIPANT_ID };

export async function updateParticipantAction(id: string, patch: Partial<Participant>) {
  return repository.updateParticipant(id, patch);
}

export async function updateCaptureChannelAction(
  participantId: string,
  channel: CaptureChannelName,
  patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
) {
  return repository.updateCaptureChannel(participantId, channel, patch);
}

export async function submitCaptureAction(participantId: string = DEMO_PARTICIPANT_ID) {
  return repository.submitCapture(participantId);
}

export async function getOnboardingProgressAction(participantId: string = DEMO_PARTICIPANT_ID) {
  return repository.getOnboardingProgress(participantId);
}

export async function updateSectionStatusAction(
  section: OnboardingSectionKey,
  status: OnboardingSectionStatus,
  participantId: string = DEMO_PARTICIPANT_ID
) {
  return repository.updateSectionStatus(participantId, section, status);
}

export async function updateBiomarkerAction(
  participantId: string,
  id: string,
  patch: Partial<Biomarker>
) {
  return repository.updateBiomarker(id, patch);
}

export async function updateAiDraftAction(participantId: string, patch: Partial<AiDraft>) {
  return repository.updateAiDraft(participantId, patch);
}

export async function signOffAction(
  participantId: string,
  stage: ReviewStage,
  data: { reviewer_name: string; reviewer_credential: string; notes: string }
) {
  return repository.signOff(participantId, stage, data);
}

export async function releaseCardAction(participantId: string) {
  return repository.releaseCard(participantId);
}

export async function resolveAttentionAction(participantId: string) {
  return repository.resolveAttention(participantId);
}

export async function listDailyLogsAction(participantId: string = DEMO_PARTICIPANT_ID) {
  return repository.listDailyLogs(participantId);
}

export async function upsertDailyLogAction(
  logDate: string,
  patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>,
  participantId: string = DEMO_PARTICIPANT_ID
) {
  return repository.upsertDailyLog(participantId, logDate, patch);
}

export async function uploadFileAction(
  participantId: string,
  kind: FileKind,
  file: UploadableFile
) {
  return repository.uploadFile(participantId, kind, file);
}

export async function getFileUrlAction(fileId: string) {
  return repository.getFileUrl(fileId);
}
