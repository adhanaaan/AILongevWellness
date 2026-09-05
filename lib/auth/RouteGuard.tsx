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

  // Only care_team accounts may see the admin PORTAL. The care-team LOGIN, though,
  // is reachable by anyone who isn't already care_team — including a signed-in
  // participant, so a presenter (or a participant on a shared device) can sign out
  // and switch into the care-team account without first hunting for a sign-out.
  // The login screen itself handles the "you're signed in as a participant" case.
  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    if (role === "care_team") {
      if (onLoginScreen) router.replace("/admin");
      return;
    }
    // A participant may view the login (to switch accounts) but never the portal.
    if (participantId) {
      if (!onLoginScreen) router.replace("/");
      return;
    }
    if (!onLoginScreen) router.replace("/admin/login");
  }, [loading, role, participantId, onLoginScreen, router]);

  if (onLoginScreen) {
    // Show the login to signed-out visitors AND signed-in participants; a
    // care_team member is redirected to the portal (handled above).
    if (isSupabaseConfigured && (loading || role === "care_team")) return null;
    return <>{children}</>;
  }
  if (isSupabaseConfigured && (loading || role !== "care_team")) return null;
  return <>{children}</>;
}
