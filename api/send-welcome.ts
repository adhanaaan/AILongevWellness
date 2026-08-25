import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { missingServerEnv } from "../lib/config/serverEnv";
import { welcomeEmailHtml, welcomeEmailText } from "../lib/notify/welcomeTemplate";

// Vercel serverless function (see vercel.json). Sends the one-time
// "welcome — complete your snapshot by uploading a lab report" email right
// after a participant finishes the quiz.
//
// Deliberately SAFE-BY-DEFAULT: if RESEND_API_KEY / RESEND_FROM aren't set it
// returns { sent: false } with 200 and sends nothing, so shipping this can't
// email anyone until it's explicitly configured. The recipient is ALWAYS the
// authenticated caller's own email (read server-side from the verified token) —
// never a client-supplied address — so it can't be used to email arbitrary
// people.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Same verified sender as the Supabase auth emails (set RESEND_FROM to that
// address). APP_URL is the deep-link target for the email's CTA button.
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "";
const APP_URL = process.env.APP_URL ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const missing = missingServerEnv(["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]);
  if (missing.length > 0) {
    res.status(500).json({ error: `Server misconfigured — missing env var(s): ${missing.join(", ")}` });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  // Email not configured — no-op quietly so the quiz flow never breaks on it.
  if (!RESEND_API_KEY || !RESEND_FROM) {
    res.status(200).json({ sent: false, reason: "email_not_configured" });
    return;
  }

  // Scoped to the caller — RLS + auth ensure we only ever read this user's own
  // identity and participant row.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await callerClient.auth.getUser(token);
  const email = userData?.user?.email;
  if (userErr || !email) {
    res.status(401).json({ error: "Could not resolve the signed-in user" });
    return;
  }

  // Best-effort first name for the greeting — never blocks the send.
  let firstName = "";
  const { participantId } = req.body ?? {};
  if (participantId) {
    const { data: participant } = await callerClient
      .from("participants")
      .select("name")
      .eq("id", participantId)
      .maybeSingle();
    firstName = (participant?.name ?? "").trim().split(/\s+/)[0] ?? "";
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: email,
        subject: "Complete your wellness snapshot",
        html: welcomeEmailHtml({ firstName, appUrl: APP_URL }),
        text: welcomeEmailText({ firstName, appUrl: APP_URL }),
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      res.status(502).json({ error: `Email provider error: ${detail}` });
      return;
    }

    res.status(200).json({ sent: true });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "Email send failed" });
  }
}
