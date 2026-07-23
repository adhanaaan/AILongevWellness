/**
 * Claude's response content is an array of blocks — "text", but also possibly
 * "thinking", "redacted_thinking", "tool_use", etc. depending on the model and
 * request. Grabbing content[0] and assuming it's the text block breaks the
 * moment a thinking block comes first, silently producing an empty string.
 * This finds every text block and concatenates them instead.
 */
export function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n");
}
