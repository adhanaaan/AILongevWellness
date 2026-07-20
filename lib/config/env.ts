/**
 * Client-safe config, read from EXPO_PUBLIC_* env vars (Expo inlines these into
 * the bundle at build time — see .env.example). Server-only secrets
 * (SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY) are read directly inside the
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
