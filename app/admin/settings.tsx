import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shield, Bell, Database, Users, LogOut } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Avatar, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/config/env";
import { getSupabaseClient } from "@/lib/data/supabase";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

function projectHost(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function AdminSettingsPage() {
  const { session, signOut } = useAuth();
  const [teamCount, setTeamCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabaseClient();
    if (!client) return;
    client
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "care_team")
      .then(({ count }) => setTeamCount(count ?? null));
  }, []);

  const email = session?.user?.email ?? "Demo clinician";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <AdminShell title="Settings">
      <Text style={styles.heading}>Admin settings</Text>

      <Card style={styles.profileCard}>
        <Avatar initials={initials} size="lg" />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{email}</Text>
          <Text style={styles.profileRole}>Care team member</Text>
        </View>
      </Card>

      <View style={styles.sections}>
        <SettingSection
          icon={<Shield size={20} color={colors.sageDark} />}
          title="Permissions"
          description="Full care team access. Can review, sign off, and release participant cards."
        />
        <SettingSection
          icon={<Database size={20} color={colors.sageDark} />}
          title="Data source"
          description={
            isSupabaseConfigured
              ? `Connected to Supabase (${projectHost(SUPABASE_URL)}).`
              : "Using in-memory mock data — no Supabase project configured."
          }
        />
        <SettingSection
          icon={<Users size={20} color={colors.sageDark} />}
          title="Team"
          description={
            isSupabaseConfigured
              ? teamCount !== null
                ? `${teamCount} care team account${teamCount === 1 ? "" : "s"} registered.`
                : "Loading…"
              : "Connect Supabase to see your team roster."
          }
        />
        <SettingSection
          icon={<Bell size={20} color={colors.sageDark} />}
          title="Notifications"
          description="Not yet built — review queue and attention alerts are checked in-app for now, not by email."
        />
      </View>

      {isSupabaseConfigured && (
        <Button
          variant="secondary"
          iconLeft={<LogOut size={16} color={colors.sageDark} />}
          onPress={signOut}
          style={styles.signOut}
        >
          Sign out
        </Button>
      )}
    </AdminShell>
  );
}

function SettingSection({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionRow}>
        {icon}
        <View style={styles.sectionContent}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDesc}>{description}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: spacing["2xl"],
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing["2xl"],
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.bodyLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  profileRole: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 2,
  },
  sections: {
    gap: spacing.md,
  },
  sectionCard: {
    padding: spacing.lg,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  sectionDesc: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  signOut: {
    marginTop: spacing["2xl"],
    alignSelf: "flex-start",
  },
});
