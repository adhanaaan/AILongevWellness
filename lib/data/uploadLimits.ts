import type { FileKind } from "../types/db";

// Mirrors supabase/migrations/0003_upload_limits.sql's bucket-level
// file_size_limit values -- this is the client-side pre-check so a
// participant finds out immediately rather than after a slow upload only to
// have Supabase Storage reject it.
export const UPLOAD_MAX_BYTES: Record<FileKind, number> = {
  lab_report: 20 * 1024 * 1024,
  body_comp: 20 * 1024 * 1024,
  apple_health_export: 200 * 1024 * 1024,
};

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/**
 * Size-only check -- MIME type is already narrowed by the document picker's
 * own type filter at selection time and enforced server-side by the storage
 * bucket's allowed_mime_types. Re-validating MIME here would mean trusting
 * the browser-reported blob.type, which has proven unreliable in this app
 * (see detectMediaType in api/extract-lab.ts).
 */
export function validateUploadSize(kind: FileKind, sizeBytes: number): string | null {
  const max = UPLOAD_MAX_BYTES[kind];
  if (sizeBytes > max) {
    return `That file is too large (max ${formatMb(max)}). Please upload a smaller file.`;
  }
  return null;
}
