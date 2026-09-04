import OpenAI from "openai";

// Single place the app talks to OpenAI. Centralised so the model IDs, key, and
// request shape live in one file — the same seam the Gemini/Anthropic providers
// used before, so swapping providers never touches the endpoints.
//
// Why OpenAI: stable, long-lived model names (they don't retire them out from
// under new keys), first-class strict JSON-schema structured output, native
// vision + PDF input, and a CJS-compatible SDK (no ESM-vs-CommonJS build drama
// on Vercel). The deterministic scoring/PhenoAge/age-clocks never used an LLM
// and are untouched.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

// Accuracy-critical work (reading lab values, drafting the reviewed narrative)
// uses the full model; the concierge chat uses the mini model for speed/cost.
// Env-overridable so a model bump is a Vercel env change, not a code PR.
export const OPENAI_MODELS = {
  extract: process.env.OPENAI_MODEL || "gpt-4o",
  draft: process.env.OPENAI_MODEL || "gpt-4o",
  chat: process.env.OPENAI_MODEL_MINI || "gpt-4o-mini",
} as const;

// JSON-Schema type constants, so callers build response schemas without importing
// anything provider-specific. Standard JSON Schema uses lowercase type names.
export const JsonType = {
  OBJECT: "object",
  STRING: "string",
  NUMBER: "number",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  ARRAY: "array",
  NULL: "null",
} as const;

function client(): OpenAI {
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

function requireContent(content: string | null | undefined): string {
  if (!content) throw new Error("OpenAI returned an empty response");
  return content;
}

/**
 * Coerce a plain JSON Schema into OpenAI strict-mode form: every object gets
 * `additionalProperties: false` and lists ALL its properties in `required`
 * (strict mode's rule). Properties that were NOT required in the source schema
 * are made nullable instead, so an "optional" field still validates when the
 * model omits it (it returns null). Deep-clones — never mutates the input.
 */
function toStrictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toStrictSchema);
  if (!node || typeof node !== "object") return node;
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    const props = out.properties as Record<string, unknown>;
    const keys = Object.keys(props);
    const originallyRequired = new Set((out.required as string[]) ?? keys);
    const nextProps: Record<string, unknown> = {};
    for (const key of keys) {
      let child = toStrictSchema(props[key]);
      if (!originallyRequired.has(key)) child = makeNullable(child);
      nextProps[key] = child;
    }
    out.properties = nextProps;
    out.required = keys;
    out.additionalProperties = false;
  } else if (out.type === "array" && out.items) {
    out.items = toStrictSchema(out.items);
  }
  return out;
}

function makeNullable(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as Record<string, unknown>;
  if (typeof n.type === "string") return { ...n, type: [n.type, "null"] };
  if (Array.isArray(n.type) && !n.type.includes("null")) return { ...n, type: [...n.type, "null"] };
  return n;
}

function jsonSchemaFormat(responseSchema: unknown) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "result",
      strict: true,
      schema: toStrictSchema(responseSchema) as Record<string, unknown>,
    },
  };
}

/**
 * Extract structured JSON from a document (image or PDF). Sends the file inline
 * (data URL) plus the prompt, constrained to `responseSchema`. temperature 0 for
 * deterministic reading. Returns the parsed object.
 */
export async function extractJsonFromDocument<T>(opts: {
  base64: string;
  mimeType: string;
  prompt: string;
  responseSchema: unknown;
  model?: string;
}): Promise<T> {
  const dataUrl = `data:${opts.mimeType};base64,${opts.base64}`;
  const filePart =
    opts.mimeType === "application/pdf"
      ? ({ type: "file", file: { filename: "document.pdf", file_data: dataUrl } } as const)
      : ({ type: "image_url", image_url: { url: dataUrl } } as const);

  const resp = await client().chat.completions.create({
    model: opts.model ?? OPENAI_MODELS.extract,
    temperature: 0,
    max_tokens: 8000,
    response_format: jsonSchemaFormat(opts.responseSchema),
    messages: [
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [{ type: "text", text: opts.prompt }, filePart] as any,
      },
    ],
  });
  return JSON.parse(requireContent(resp.choices[0]?.message?.content)) as T;
}

/**
 * Generate structured JSON from a text prompt (+ optional system instruction).
 */
export async function generateJson<T>(opts: {
  system?: string;
  prompt: string;
  responseSchema: unknown;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const resp = await client().chat.completions.create({
    model: opts.model ?? OPENAI_MODELS.draft,
    temperature: opts.temperature ?? 0.4,
    max_tokens: 8000,
    response_format: jsonSchemaFormat(opts.responseSchema),
    messages,
  });
  return JSON.parse(requireContent(resp.choices[0]?.message?.content)) as T;
}

/**
 * Plain-text chat with history + system instruction.
 */
export async function chatText(opts: {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
}): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  for (const m of opts.messages) messages.push({ role: m.role, content: m.content });

  const resp = await client().chat.completions.create({
    model: opts.model ?? OPENAI_MODELS.chat,
    temperature: 0.5,
    messages,
  });
  return resp.choices[0]?.message?.content ?? "";
}
