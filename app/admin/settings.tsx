import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Shield, Bell, Database, Users, LogOut } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Avatar, Button } from "@/components/ui";
import { InsightsSectionHeader } from "@/components/participant/InsightsSectionHeader";
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
      <View style={styles.section}>
        <InsightsSectionHeader label="Account" />
        <Card padding="lg" style={styles.profileCard}>
          <Avatar initials={initials} size="lg" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Care team</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <InsightsSectionHeader label="Access & data" />
        <Card padding="none" style={styles.groupCard}>
          <SettingRow
            icon={<Shield size={18} color={colors.inkMuted} strokeWidth={1.75} />}
            title="Permissions"
            description="Full care team access. Can review, sign off, and release participant cards."
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Database size={18} color={colors.inkMuted} strokeWidth={1.75} />}
            title="Data source"
            description={
              isSupabaseConfigured
                ? `Connected to Supabase (${projectHost(SUPABASE_URL)}).`
                : "Using in-memory mock data — no Supabase project configured."
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Users size={18} color={colors.inkMuted} strokeWidth={1.75} />}
            title="Team"
            description={
              isSupabaseConfigured
                ? teamCount !== null
                  ? `${teamCount} care team account${teamCount === 1 ? "" : "s"} registered.`
                  : "Loading…"
                : "Connect Supabase to see your team roster."
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Bell size={18} color={colors.inkMuted} strokeWidth={1.75} />}
            title="Notifications"
            description="Review queue and attention alerts are checked in-app for now, not by email."
            badge="Not yet built"
          />
        </Card>
      </View>

      {isSupabaseConfigured && (
        <Button
          variant="secondary"
          iconLeft={<LogOut size={16} color={colors.teal} strokeWidth={2} />}
          onPress={signOut}
          style={styles.signOut}
        >
          Sign out
        </Button>
      )}
    </AdminShell>
  );
}

function SettingRow({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          {badge ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing["2xl"],
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
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
    marginTop: spacing.sm,
  },
  roleBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  groupCard: {
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
  },
  rowIcon: {
    paddingTop: 1,
  },
  rowContent: {
    flex: 1,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  pendingBadge: {
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  pendingBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.4,
    color: colors.inkMuted,
  },
  rowDesc: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 3,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing["2xl"],
  },
  signOut: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
});
