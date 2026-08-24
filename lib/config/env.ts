/**
 * Client-safe config, read from EXPO_PUBLIC_* env vars (Expo inlines these into
 * the bundle at build time — see .env.example). Server-only secrets
 * (SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY) are read directly inside the
 * /api/*.ts serverless functions instead of here, so they never get anywhere
 * near client code.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True once real Supabase credentials are configured; false falls back to the in-memory mock. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Base URL for the /api/* Vercel serverless functions. Empty string means "same
 * origin, relative path" — correct for the web build. Native builds only reach
 * the API if this is set to the deployed origin (e.g. https://ai-wellness.vercel.app).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/**
 * True when the Terra wearable-aggregator integration is live. Gates the
 * "Connect a wearable" flow in the UI. The actual Terra secrets
 * (TERRA_DEV_ID / TERRA_API_KEY / TERRA_SIGNING_SECRET) are server-only and read
 * inside /api/terra-*.ts — this public flag just controls whether the client
 * offers the connect button. Requires Supabase too (Terra data lands in it).
 */
export const isTerraEnabled =
  isSupabaseConfigured && process.env.EXPO_PUBLIC_TERRA_ENABLED === "true";

/**
 * Gates the Apple Health "auto-sync from iPhone" (Health Auto Export) option.
 * Deferred for now — we're shipping the Terra wearable integration first — so
 * this stays off by default and the health-export card is hidden. The backend
 * (api/health-ingest*.ts) and migration support remain in place, so enabling it
 * later is a flag flip, not a rebuild.
 */
export const isHealthExportEnabled =
  isSupabaseConfigured && process.env.EXPO_PUBLIC_HEALTH_EXPORT_ENABLED === "true";
