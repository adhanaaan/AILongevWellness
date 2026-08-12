import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "../lib/ai/extractText";
import { AVA_DISCLAIMER } from "../lib/ava/constants";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

function systemPrompt(context: unknown, reviewed: boolean) {
  return `You are AVA, a warm, plain-spoken wellness concierge and health guide for a participant in an
executive longevity programme. Your job is to help them understand their own wellness data and to
answer their health and wellness questions, anytime — you are their always-available health copilot,
not just a reader of a finished report.

You have this participant's CONTEXT below — their profile, and (once generated) their wellness scores,
biological age, biomarkers, suggested focus areas, and care plan. Use it to make your answers specific
to them.

${reviewed
  ? "Their wellness card has been reviewed and signed off by their care team, so you can speak to it as their reviewed results."
  : "IMPORTANT: their scores and biomarkers are a PRELIMINARY, AI-generated draft that has NOT yet been reviewed by their care team. Whenever you cite a specific score or value, briefly remind them it is preliminary and may change once their care team reviews it."}

What you can do:
- Explain their scores, biological age, biomarkers, and suggested focus areas in plain language.
- Answer general wellness, nutrition, sleep, movement, stress, and longevity questions using
  well-established general knowledge, and connect it back to their own data where relevant.
- Be encouraging, specific, and practical.

Hard rules (this is a wellness programme, not medical care):
- Never diagnose a condition, never recommend or adjust medications/supplements/dosages, never give a
  treatment plan, and never interpret symptoms as triaging an illness. For anything like that, warmly
  point them to their care team.
- Never compare this participant to any other participant, or imply other participants or their data exist.
- Never invent a specific number that isn't in the CONTEXT. If you don't have a value, say so plainly.
- Do NOT append any disclaimer sentence yourself — that is added separately by the app.
- Keep answers to 2-5 sentences, warm and concise.

CONTEXT:
${JSON.stringify(context)}`;
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

  // A pipeline row existing (readable under RLS) is the authorization check —
  // it proves this is the caller's own participant. We deliberately do NOT gate
  // on state === "delivered" anymore: AVA answers anytime, grounded on whatever
  // data exists (a preliminary draft, or just the profile). The system prompt is
  // told whether the card is reviewed so it can caveat preliminary numbers.
  const { data: pipeline } = await callerClient
    .from("pipeline")
    .select("*")
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!pipeline) {
    res.status(403).json({ error: "Not authorized for this participant" });
    return;
  }

  const [{ data: participant }, { data: aiDraft }, { data: biomarkers }, { data: reviews }] = await Promise.all([
    callerClient.from("participants").select("*").eq("id", participantId).maybeSingle(),
    callerClient.from("ai_draft").select("*").eq("participant_id", participantId).maybeSingle(),
    callerClient.from("biomarkers").select("*").eq("participant_id", participantId),
    callerClient.from("reviews").select("*").eq("participant_id", participantId),
  ]);

  if (!participant) {
    res.status(409).json({ error: "Your profile isn't set up yet" });
    return;
  }

  const reviewed = pipeline.state === "delivered";
  const context = {
    participant,
    aiDraft: aiDraft ?? null,
    biomarkers: biomarkers ?? [],
    reviews: reviews ?? [],
  };

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const priorMessages: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(history)
    ? history.map((m: { role: "user" | "ava"; text: string }) => ({
        role: m.role === "ava" ? "assistant" : "user",
        content: m.text,
      }))
    : [];

  try {
    const response = await anthropic.messages.create({
      // Opus, not Sonnet, for grounding quality against the real card data.
      // Thinking explicitly off -- this is plain-text chat with no tool
      // call, so none of the disabled-thinking pitfalls (tool calls written
      // as text) apply, and it keeps a concierge chat reply fast.
      model: "claude-opus-5",
      max_tokens: 1000,
      thinking: { type: "disabled" },
      system: systemPrompt(context, reviewed),
      messages: [...priorMessages, { role: "user", content: message }],
    });
    const reply = extractText(response.content) || "I'm not able to answer that right now.";
    res.status(200).json({ reply, disclaimer: AVA_DISCLAIMER });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : "AVA is unavailable right now" });
  }
}
