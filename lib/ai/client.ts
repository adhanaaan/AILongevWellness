import { API_BASE_URL } from "@/lib/config/env";

async function postJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export function askAva(
  token: string,
  participantId: string,
  message: string,
  history: Array<{ role: "user" | "ava"; text: string }>
): Promise<{ reply: string; disclaimer: string }> {
  return postJson("/api/ava", token, { participantId, message, history });
}

export function extractLabReport(
  token: string,
  participantId: string,
  fileId: string
): Promise<{ extracted: string[] }> {
  return postJson("/api/extract-lab", token, { participantId, fileId });
}

export function generateDraft(token: string, participantId: string): Promise<{ draft: unknown }> {
  return postJson("/api/generate-draft", token, { participantId });
}

// Backfills only the care_plan on a delivered card that never got one, without
// touching the signed assessment (see api/generate-care-plan.ts).
export function generateCarePlan(token: string, participantId: string): Promise<{ draft: unknown }> {
  return postJson("/api/generate-care-plan", token, { participantId });
}

export function extractWearableExport(
  token: string,
  participantId: string,
  fileId: string
): Promise<{ extracted: string[] }> {
  return postJson("/api/extract-wearables", token, { participantId, fileId });
}

export function extractBodyComp(
  token: string,
  participantId: string,
  fileId: string
): Promise<{ extracted: string[] }> {
  return postJson("/api/extract-body-comp", token, { participantId, fileId });
}

export function terraConnect(
  token: string,
  participantId: string,
  successUrl?: string,
  failureUrl?: string
): Promise<{ url: string; expiresIn?: number }> {
  return postJson("/api/terra-connect", token, { participantId, successUrl, failureUrl });
}

export function setupHealthIngest(
  token: string,
  participantId: string,
  rotate?: boolean
): Promise<{ token: string; url: string }> {
  return postJson("/api/health-ingest-setup", token, { participantId, rotate });
}

// Both Mental-capture submits share one endpoint (api/submit-mental) — merged to
// stay under Vercel Hobby's 12-function cap. It writes whichever inputs it gets.
export function submitRecognizeResult(
  token: string,
  participantId: string,
  trialsMs: number[]
): Promise<{ reaction_time: number; cog_composite: number }> {
  return postJson("/api/submit-mental", token, { participantId, trialsMs });
}

export function submitMentalQuestionnaire(
  token: string,
  participantId: string,
  who5: number[],
  pss4: number[]
): Promise<{ who5_wellbeing: number; pss4_stress: number }> {
  return postJson("/api/submit-mental", token, { participantId, who5, pss4 });
}
