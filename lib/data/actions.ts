"use server";

import { revalidatePath } from "next/cache";
import { repository, DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import type {
  AiDraft,
  Biomarker,
  CaptureChannelName,
  CaptureChannelStatus,
  EnteredBy,
  Participant,
  ReviewStage,
} from "@/lib/types/db";

function revalidateParticipantSurfaces(participantId: string) {
  revalidatePath("/");
  revalidatePath("/capture");
  revalidatePath("/card");
  revalidatePath("/ava");
  revalidatePath("/settings");
  revalidatePath("/admin");
  revalidatePath(`/admin/participants/${participantId}`);
}

export async function updateParticipantAction(id: string, patch: Partial<Participant>) {
  const result = await repository.updateParticipant(id, patch);
  revalidateParticipantSurfaces(id);
  return result;
}

export async function updateCaptureChannelAction(
  participantId: string,
  channel: CaptureChannelName,
  patch: { status?: CaptureChannelStatus; entered_by?: EnteredBy }
) {
  const result = await repository.updateCaptureChannel(participantId, channel, patch);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function submitCaptureAction(participantId: string = DEMO_PARTICIPANT_ID) {
  const result = await repository.submitCapture(participantId);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function updateBiomarkerAction(
  participantId: string,
  id: string,
  patch: Partial<Biomarker>
) {
  const result = await repository.updateBiomarker(id, patch);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function updateAiDraftAction(participantId: string, patch: Partial<AiDraft>) {
  const result = await repository.updateAiDraft(participantId, patch);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function signOffAction(
  participantId: string,
  stage: ReviewStage,
  data: { reviewer_name: string; reviewer_credential: string; notes: string }
) {
  const result = await repository.signOff(participantId, stage, data);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function releaseCardAction(participantId: string) {
  const result = await repository.releaseCard(participantId);
  revalidateParticipantSurfaces(participantId);
  return result;
}

export async function resolveAttentionAction(participantId: string) {
  const result = await repository.resolveAttention(participantId);
  revalidateParticipantSurfaces(participantId);
  return result;
}
