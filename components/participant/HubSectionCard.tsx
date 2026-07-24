import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Lock } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";
import type { CaptureSectionState } from "@/lib/onboarding/flow";

export interface HubSectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: CaptureSectionState;
  onPress: () => void;
}

const STATUS_LABEL: Record<CaptureSectionState, string> = {
  locked: "Locked",
  available: "Not started",
  in_progress: "In progress",
  done: "Done",
};

const ACTION_LABEL: Record<CaptureSectionState, string> = {
  locked: "Locked",
  available: "Start",
  in_progress: "Continue",
  done: "Review",
};

export function HubSectionCard({ icon, title, description, state, onPress }: HubSectionCardProps) {
  const locked = state === "locked";

  return (
    <GlassCard tint="light" padding="md" radius="2xl" style={locked ? styles.lockedCard : undefined}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, state === "done" && styles.iconCircleDone]}>
          {locked ? <Lock size={18} color={colors.inkMuted} /> : icon}
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.statusBadge,
            state === "done" && styles.statusBadgeDone,
            state === "in_progress" && styles.statusBadgeInProgress,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              state === "done" && styles.statusTextDone,
              state === "in_progress" && styles.statusTextInProgress,
            ]}
          >
            {STATUS_LABEL[state]}
          </Text>
        </View>
      </View>

      <Button variant={locked ? "secondary" : "secondary"} size="sm" disabled={locked} onPress={onPress}>
        {ACTION_LABEL[state]}
      </Button>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  lockedCard: { opacity: 0.6 },
  topRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconCircleDone: { backgroundColor: colors.teal },
  info: { flex: 1 },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  description: { fontFamily: fontFamilies.body, fontSize: fontSizes.labelMd, color: colors.inkMuted },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  statusBadge: {
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
  },
  statusBadgeDone: { backgroundColor: colors.tealTint },
  statusBadgeInProgress: { backgroundColor: colors.warningTint },
  statusText: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.caption, color: colors.inkMuted },
  statusTextDone: { color: colors.tealDark },
  statusTextInProgress: { color: colors.metabolicDark },
});
