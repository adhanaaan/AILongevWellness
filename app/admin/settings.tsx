import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { User, Shield, Bell, Database } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, Avatar } from "@/components/ui";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Settings">
      <Text style={styles.heading}>Admin settings</Text>

      <Card style={styles.profileCard}>
        <Avatar initials="HM" size="lg" />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Dr. Helena Marsh</Text>
          <Text style={styles.profileRole}>
            MBBS, General Practice · Lead Clinician
          </Text>
          <Text style={styles.profileMeta}>Admin since Jan 2025</Text>
        </View>
      </Card>

      <View style={styles.sections}>
        <SettingSection
          icon={<Shield size={20} color={colors.sageDark} />}
          title="Permissions"
          description="Full admin access. Can review, sign off, and release participant cards."
        />
        <SettingSection
          icon={<Bell size={20} color={colors.sageDark} />}
          title="Notifications"
          description="Email alerts for new review queue items and attention flags."
        />
        <SettingSection
          icon={<Database size={20} color={colors.sageDark} />}
          title="Data source"
          description="Currently using in-memory mock data. Connect Supabase for production."
        />
        <SettingSection
          icon={<User size={20} color={colors.sageDark} />}
          title="Team"
          description="Dr. Helena Marsh (GP) · Dr. Wei Lin (TCM) · 2 reviewers active."
        />
      </View>
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
  profileMeta: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
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
});
