import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "../lib/ai/extractText";
import { AVA_DISCLAIMER } from "../lib/ava/constants";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// Curate the raw DB rows into a labeled, model-friendly context so answers stay
// grounded in the participant's ACTUAL numbers. Flagged markers are pulled out
// separately (they're what the participant most often asks about), and the
// participant's full biomarker set is kept so a specific lookup still resolves.
function buildContext(
  participant: Record<string, unknown>,
  aiDraft: Record<string, unknown> | null,
  biomarkers: Array<Record<string, unknown>>,
  reviews: Array<Record<string, unknown>>
) {
  const draft = aiDraft ?? undefined;
  const bio = biomarkers ?? [];
  return {
    profile: {
      name: participant.name,
      age: participant.age,
      sex: participant.sex,
      goals: participant.goals,
    },
    scores: draft?.scores ?? null,
    biological_age: draft?.biological_age ?? null,
    chronological_age: draft?.chronological_age ?? participant.age ?? null,
    strengths: draft?.strengths ?? [],
    suggested_focus: draft?.suggested_focus ?? [],
    discussion_points: draft?.discussion_points ?? [],
    key_contributors: draft?.key_contributors ?? [],
    care_plan: draft?.care_plan ?? null,
    flagged_biomarkers: bio
      .filter((b) => b.flagged)
      .map((b) => ({ label: b.label, value: b.value, unit: b.unit, pillar: b.pillar, ref_low: b.ref_low, ref_high: b.ref_high })),
    all_biomarkers: bio.map((b) => ({ key: b.key, label: b.label, value: b.value, unit: b.unit, pillar: b.pillar, flagged: b.flagged })),
    reviewers: reviews
      .filter((r) => r.signed_at)
      .map((r) => ({ stage: r.stage, name: r.reviewer_name, credential: r.reviewer_credential })),
  };
}

function systemPrompt(context: unknown, reviewed: boolean) {
  return `You are AVA, the warm, plain-spoken wellness concierge for a participant in an executive
longevity programme. You are their always-available health copilot — not just a reader of a finished
report. Your job is to help them understand their own wellness data and answer their health and
wellness questions anytime.

You have this participant's CONTEXT below — their profile, wellness scores, biological age, biomarkers
(including which are flagged), strengths, suggested focus areas, discussion points, and care plan.
Ground every answer in it.

${reviewed
  ? "Their wellness card has been reviewed and signed off by their care team, so speak to it as their reviewed results."
  : "IMPORTANT: their scores and biomarkers are a PRELIMINARY, AI-generated draft that has NOT yet been reviewed by their care team. Whenever you cite a specific score or value, briefly remind them it is preliminary and may change once their care team reviews it."}

How to answer well:
- Lead with THEIR actual number. Name the specific score or biomarker value and unit from the CONTEXT
  ("Your metabolic score is 68", "Your HbA1c is 5.9%") rather than speaking generically.
- Connect it to what it means for them, in plain language a busy executive can act on. Be specific,
  encouraging, and practical.
- When they ask what to do, draw on their suggested_focus and care_plan, and give one clear, realistic
  next step. Prefer well-established general wellness knowledge; do not invent studies.
- Keep answers to 2-5 sentences, warm and concise. It's fine to end by offering to go deeper on a
  related part of their data.

Hard rules (this is a wellness programme, not medical care):
- Never diagnose a condition, never recommend or adjust medications/supplements/dosages, never give a
  treatment plan, and never interpret symptoms as triaging an illness. For anything like that, warmly
  point them to their care team.
- Never compare this participant to any other participant, or imply other participants or their data exist.
- Never invent a specific number, biomarker, study, author, or year that isn't in the CONTEXT. If you
  don't have a value, say so plainly and offer what you do have.
- Do NOT append any disclaimer sentence yourself — that is added separately by the app.

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
  const context = buildContext(participant, aiDraft ?? null, biomarkers ?? [], reviews ?? []);

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
