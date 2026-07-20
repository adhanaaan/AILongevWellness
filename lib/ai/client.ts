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
): Promise<{ reply: string }> {
  return postJson("/api/ava", token, { participantId, message, history });
}

export function extractLabReport(
  token: string,
  participantId: string,
  fileId: string
): Promise<{ extracted: string[] }> {
  return postJson("/api/extract-lab", token, { participantId, fileId });
}
