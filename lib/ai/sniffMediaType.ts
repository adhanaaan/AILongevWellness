/**
 * Detect a file's media type from its actual bytes (magic numbers), not its
 * name or the client-provided content-type — both of which are unreliable on
 * mobile uploads (a PDF stored under a bare UUID, an iPhone photo that's really
 * HEIC). Anthropic only accepts PDF + JPEG/PNG/GIF/WebP for document/image
 * blocks; anything else (notably HEIC/HEIF from an iPhone camera) is rejected
 * with an opaque 400, so we catch the common unsupported case up front and
 * return a clear, actionable message instead.
 */
export type SniffResult =
  | { kind: "supported"; mediaType: string }
  | { kind: "unsupported"; reason: "heic" }
  | { kind: "unknown" };

export const UNSUPPORTED_FILE_MESSAGE =
  "That file type isn't supported. Please upload a PDF, or a PNG/JPEG photo or screenshot of your report. (iPhone HEIC photos aren't supported — take a screenshot, or set Camera > Formats to 'Most Compatible'.)";

export function sniffMediaType(b: Uint8Array): SniffResult {
  const at = (sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);

  // PDF: "%PDF"
  if (at([0x25, 0x50, 0x44, 0x46])) return { kind: "supported", mediaType: "application/pdf" };
  // PNG
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "supported", mediaType: "image/png" };
  // JPEG
  if (at([0xff, 0xd8, 0xff])) return { kind: "supported", mediaType: "image/jpeg" };
  // GIF: "GIF8"
  if (at([0x47, 0x49, 0x46, 0x38])) return { kind: "supported", mediaType: "image/gif" };
  // WebP: "RIFF"...."WEBP"
  if (at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: "supported", mediaType: "image/webp" };
  }
  // HEIC/HEIF (ISO-BMFF): "ftyp" at offset 4, brand at offset 8
  if (at([0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (["heic", "heix", "heif", "mif1", "msf1", "hevc", "hevx"].includes(brand)) {
      return { kind: "unsupported", reason: "heic" };
    }
  }
  return { kind: "unknown" };
}
