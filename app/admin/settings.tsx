import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shield, Bell, Database, Users, LogOut } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Avatar, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured, SUPABASE_URL } from "@/lib/config/env";
import { getSupabaseClient } from "@/lib/data/supabase";
import { colors, fontFamilies, fontSizes, spacing, radii } from "@/lib/theme/tokens";

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
          <Text style={styles.profileName} numberOfLines={1}>{email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Care team</Text>
          </View>
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
        <View style={styles.sectionIcon}>{icon}</View>
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
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
    marginBottom: spacing.xl,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.charcoal,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.sageTint,
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  roleBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  sections: {
    gap: spacing.md,
  },
  sectionCard: {
    padding: spacing.lg,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionContent: {
    flex: 1,
    paddingTop: 2,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  sectionDesc: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  signOut: {
    marginTop: spacing.xl,
    alignSelf: "flex-start",
  },
});
