/**
 * Claude is always instructed to reply with raw JSON only, but models
 * sometimes wrap the response in markdown code fences anyway (```json ... ```)
 * or add a stray sentence before/after — this strips that instead of failing
 * outright on a strict JSON.parse.
 */
export function parseJsonResponse<T>(text: string): T {
  let cleaned = text.trim();

  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: grab the outermost {...} substring in case there's leading
    // or trailing prose the model added despite instructions not to.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("AI did not return valid JSON");
  }
}
