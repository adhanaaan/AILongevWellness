import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";

// In mock mode there is no real session to check — MOCK_STATE from AuthProvider
// always reports an authenticated demo participant, so guards are a no-op and
// existing zero-setup demo/preview behavior is unchanged.

export function ParticipantGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, participantId, role } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    // A care_team account has no participant_id — send it to the admin portal,
    // not into participant signup.
    if (!participantId) router.replace(role === "care_team" ? "/admin" : "/onboarding/auth");
  }, [loading, participantId, role, router]);

  if (isSupabaseConfigured && (loading || !participantId)) return null;
  return <>{children}</>;
}

export function CareTeamGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { loading, role, participantId } = useAuth();
  const onLoginScreen = segments[segments.length - 1] === "login";

  // The admin portal is deliberately separated from the consumer app: only
  // care_team accounts may see it (or its login). A signed-in participant is a
  // lay user — they're sent back to their own app, never shown the admin login.
  // The care-team login is the only admin surface a signed-out visitor may reach.
  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    if (role === "care_team") {
      if (onLoginScreen) router.replace("/admin");
      return;
    }
    if (participantId) {
      router.replace("/");
      return;
    }
    if (!onLoginScreen) router.replace("/admin/login");
  }, [loading, role, participantId, onLoginScreen, router]);

  if (onLoginScreen) {
    // Show the login only to genuinely signed-out visitors; a signed-in
    // participant or care_team member is mid-redirect (handled above).
    if (isSupabaseConfigured && (loading || participantId || role === "care_team")) return null;
    return <>{children}</>;
  }
  if (isSupabaseConfigured && (loading || role !== "care_team")) return null;
  return <>{children}</>;
}
