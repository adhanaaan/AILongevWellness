import { GoogleGenAI, Type } from "@google/genai";

// Single place the app talks to Gemini (Google AI Studio). Centralised so the
// model IDs, keys, and request shape live in one file — and so the provider can
// be swapped back to Claude later without touching every endpoint.
//
// Why Gemini here: it ingests PDFs natively (lab reports / body-comp printouts
// are often multi-page PDFs), does vision + JSON-schema-constrained output, and
// is billed through a Google AI Studio key (GEMINI_API_KEY) — decoupled from the
// direct Anthropic API account.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

// Accuracy-critical work (reading lab values, drafting the reviewed narrative)
// uses Pro; the concierge chat uses Flash for speed/cost.
//
// Model IDs are env-overridable (GEMINI_MODEL_PRO / GEMINI_MODEL_FLASH) so a
// Google model rename/retirement is a one-line Vercel env change + redeploy,
// not a code PR. Google churns these fast — e.g. gemini-2.5-pro was retired for
// new API keys, which 404'd every draft/extraction call. Defaults track the
// current generation: 3.1 Pro (the flagship Google's own 404 recommends) and
// 3.6 Flash (stable/GA). Do NOT use "-latest" aliases here — they resolve to
// experimental builds with tighter rate limits, wrong for a production launch.
export const GEMINI_MODELS = {
  extract: process.env.GEMINI_MODEL_PRO || "gemini-3.1-pro-preview",
  draft: process.env.GEMINI_MODEL_PRO || "gemini-3.1-pro-preview",
  chat: process.env.GEMINI_MODEL_FLASH || "gemini-3.6-flash",
} as const;

// Re-export the schema Type enum so callers build response schemas without a
// second import.
export { Type as GeminiType };

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

function requireText(text: string | undefined): string {
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

/**
 * Extract structured JSON from a document (image or PDF) — the replacement for
 * the Anthropic forced-tool-call in the extraction endpoints. `responseSchema`
 * (built with GeminiType.*) constrains the output; temperature 0 for
 * deterministic reading. Returns the parsed object.
 */
export async function extractJsonFromDocument<T>(opts: {
  base64: string;
  mimeType: string;
  prompt: string;
  responseSchema: unknown;
  model?: string;
}): Promise<T> {
  const res = await client().models.generateContent({
    model: opts.model ?? GEMINI_MODELS.extract,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
          { text: opts.prompt },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema as never,
    },
  });
  return JSON.parse(requireText(res.text)) as T;
}

/**
 * Generate structured JSON from a text prompt (+ optional system instruction) —
 * the replacement for the write_narrative tool call in draft generation.
 */
export async function generateJson<T>(opts: {
  system?: string;
  prompt: string;
  responseSchema: unknown;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const res = await client().models.generateContent({
    model: opts.model ?? GEMINI_MODELS.draft,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.system,
      temperature: opts.temperature ?? 0.4,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema as never,
    },
  });
  return JSON.parse(requireText(res.text)) as T;
}

/**
 * Plain-text chat with history + system instruction — the replacement for the
 * AVA messages call.
 */
export async function chatText(opts: {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
}): Promise<string> {
  const res = await client().models.generateContent({
    model: opts.model ?? GEMINI_MODELS.chat,
    contents: opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: opts.system,
      temperature: 0.5,
    },
  });
  return res.text ?? "";
}
