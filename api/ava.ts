import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const DISCLAIMER = "This is general wellness information, not medical advice.";

function systemPrompt(card: unknown) {
  return `You are AVA, a wellness concierge for an executive health retreat. You may ONLY discuss
the information in the SIGNED_CARD JSON below — it is this one participant's reviewed and
signed-off wellness card. Never invent values that aren't in it.

Hard rules:
- This is a wellness programme, not medical care. Never diagnose, never suggest medications,
  dosages, or treatments, never discuss symptoms as if triaging a condition.
- Never compare this participant to any other participant, or reveal that other participants
  or their data exist.
- If asked something not covered by SIGNED_CARD, say you don't have that on their card and
  suggest they raise it with their care team.
- End every substantive answer with exactly this sentence: "${DISCLAIMER}"
- Keep answers to 2-4 sentences, plain language, warm and concise.

SIGNED_CARD:
${JSON.stringify(card)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const { participantId, message, history } = req.body ?? {};
  if (!participantId || typeof message !== "string") {
    res.status(400).json({ error: "participantId and message are required" });
    return;
  }

  // Scoped to the caller's own session — RLS ensures a participant can only ever
  // pull their own signed card, no matter what participantId is passed in.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: pipeline } = await callerClient
    .from("pipeline")
    .select("*")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!pipeline || pipeline.state !== "delivered") {
    res.status(409).json({ error: "Card is not ready yet" });
    return;
  }

  const [{ data: participant }, { data: aiDraft }, { data: biomarkers }, { data: reviews }] = await Promise.all([
    callerClient.from("participants").select("*").eq("id", participantId).maybeSingle(),
    callerClient.from("ai_draft").select("*").eq("participant_id", participantId).maybeSingle(),
    callerClient.from("biomarkers").select("*").eq("participant_id", participantId),
    callerClient.from("reviews").select("*").eq("participant_id", participantId),
  ]);

  if (!participant || !aiDraft) {
    res.status(409).json({ error: "Card is not ready yet" });
    return;
  }

  const card = { participant, aiDraft, biomarkers: biomarkers ?? [], reviews: reviews ?? [] };

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const priorMessages: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(history)
    ? history.map((m: { role: "user" | "ava"; text: string }) => ({
        role: m.role === "ava" ? "assistant" : "user",
        content: m.text,
      }))
    : [];

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      system: systemPrompt(card),
      messages: [...priorMessages, { role: "user", content: message }],
    });
    const block = response.content[0];
    const reply = block.type === "text" ? block.text : DISCLAIMER;
    res.status(200).json({ reply });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AVA is unavailable right now" });
  }
}
