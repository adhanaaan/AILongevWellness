import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/data/supabase";
import { isSupabaseConfigured } from "@/lib/config/env";
import { DEMO_PARTICIPANT_ID } from "@/lib/data/actions";

export type Role = "participant" | "care_team";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  role: Role | null;
  participantId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves true if sign-up produced an active session immediately (email
  // confirmation disabled in Supabase Auth settings), false if a confirmation
  // email was sent and the caller must wait for the user to click it.
  signUpParticipant: (email: string, password: string) => Promise<boolean>;
  signUpCareTeam: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

// Mock mode (no Supabase configured): always "signed in" as the demo participant,
// on both sides, so the existing zero-friction demo/preview behavior is unchanged.
// Route guards check isSupabaseConfigured directly rather than trusting this role.
const MOCK_STATE: AuthState = {
  loading: false,
  session: null,
  role: "participant",
  participantId: DEMO_PARTICIPANT_ID,
  signIn: async () => {},
  signUpParticipant: async () => true,
  signUpCareTeam: async () => true,
  signOut: async () => {},
};

const AuthContext = createContext<AuthState>(MOCK_STATE);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <AuthContext.Provider value={MOCK_STATE}>{children}</AuthContext.Provider>;
  }
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

function RealAuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabaseClient()!, []);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const loadRole = useCallback(
    async (userId: string) => {
      const { data } = await client.from("user_roles").select("role, participant_id").eq("user_id", userId).maybeSingle();
      setRole((data?.role as Role) ?? null);
      setParticipantId(data?.participant_id ?? null);
    },
    [client]
  );

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadRole(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadRole(newSession.user.id);
      } else {
        setRole(null);
        setParticipantId(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [client, loadRole]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    [client]
  );

  // Points the confirmation-email link back at whichever origin the user actually
  // signed up from (prod, or a Vercel preview URL) instead of depending solely on
  // the single static "Site URL" configured in the Supabase dashboard — that
  // still has to be added to the dashboard's Redirect URLs allow-list, but at
  // least it won't silently fall back to a mismatched default.
  const emailRedirectTo = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : undefined;

  // Bootstrapping (participants row, pipeline, capture_channels, user_roles) happens
  // in the on_auth_user_created trigger (supabase/migrations/0001_init.sql) — the
  // client only needs to pass the role + profile as signup metadata.
  const signUpParticipant = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { role: "participant" }, emailRedirectTo },
      });
      if (error) throw new Error(error.message);
      return Boolean(data.session);
    },
    [client, emailRedirectTo]
  );

  const signUpCareTeam = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { role: "care_team" }, emailRedirectTo },
      });
      if (error) throw new Error(error.message);
      return Boolean(data.session);
    },
    [client, emailRedirectTo]
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
  }, [client]);

  const value = useMemo<AuthState>(
    () => ({ loading, session, role, participantId, signIn, signUpParticipant, signUpCareTeam, signOut }),
    [loading, session, role, participantId, signIn, signUpParticipant, signUpCareTeam, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
