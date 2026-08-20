/**
 * Server-only env validation for the Vercel /api functions. `process.env.X!` is
 * only a compile-time assertion — at runtime a missing var surfaces as a cryptic
 * SDK error ("supabaseKey is required", or an Anthropic auth failure) with no
 * hint which var is unset. Call this at handler entry and return a clear 4xx so a
 * launch-night misconfiguration is diagnosable in one glance at the response.
 *
 * Lives under lib/ (not api/) so Vercel doesn't try to build it as a function.
 */
export function missingServerEnv(required: string[]): string[] {
  return required.filter((name) => {
    const v = process.env[name];
    return v === undefined || v === "";
  });
}

/** The vars every core AI + data endpoint needs to touch Supabase and Anthropic. */
export const CORE_API_ENV = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
];
