import React, { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";

// In mock mode there is no real session to check — MOCK_STATE from AuthProvider
// always reports an authenticated demo participant, so guards are a no-op and
// existing zero-setup demo/preview behavior is unchanged.

export function ParticipantGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, participantId } = useAuth();

  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    if (!participantId) router.replace("/onboarding/auth");
  }, [loading, participantId, router]);

  if (isSupabaseConfigured && (loading || !participantId)) return null;
  return <>{children}</>;
}

export function CareTeamGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { loading, role } = useAuth();
  const onLoginScreen = segments[segments.length - 1] === "login";

  useEffect(() => {
    if (!isSupabaseConfigured || loading || onLoginScreen) return;
    if (role !== "care_team") router.replace("/admin/login");
  }, [loading, role, onLoginScreen, router]);

  if (onLoginScreen) return <>{children}</>;
  if (isSupabaseConfigured && (loading || role !== "care_team")) return null;
  return <>{children}</>;
}
