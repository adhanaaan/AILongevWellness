import type { FileKind } from "../types/db";

// Pure constant (no React Native imports) so it's safe to import from both
// lib/data/supabase.ts (client) and /api/*.ts (Vercel serverless functions).
export const BUCKET_BY_KIND: Record<FileKind, string> = {
  lab_report: "lab-reports",
  body_comp: "body-comp-scans",
  apple_health_export: "health-exports",
};
