import { API_BASE_URL } from "@/lib/config/env";

/**
 * Fire the one-time post-quiz welcome + upload-labs email. The server sends
 * only to the authenticated caller's own address and no-ops when Resend isn't
 * configured, so this is safe to call fire-and-forget. Returns whether an email
 * was actually sent.
 */
export async function sendWelcomeEmail(token: string, participantId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/send-welcome`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ participantId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Welcome email request failed");
  return Boolean(data.sent);
}
