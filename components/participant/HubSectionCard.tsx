import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check, ChevronRight, Lock, type LucideIcon } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";
import type { CaptureSectionState } from "@/lib/onboarding/flow";

export interface HubSectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  state: CaptureSectionState;
  onPress: () => void;
  /** Optional sections show an "Optional" tag and don't gate completion. */
  optional?: boolean;
}

const STATUS_LABEL: Record<CaptureSectionState, string> = {
  locked: "Locked",
  available: "Not started",
  in_progress: "In progress",
  done: "Done",
};

export function HubSectionCard({
  icon: Icon,
  title,
  description,
  state,
  onPress,
  optional = false,
}: HubSectionCardProps) {
  const locked = state === "locked";
  const done = state === "done";
  const showOptional = optional && !done;

  return (
    <TouchableOpacity
      style={[styles.row, done && styles.rowDone]}
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, done && styles.iconCircleDone]}>
        {locked ? (
          <Lock size={18} color={colors.inkMuted} />
        ) : (
          <Icon size={20} color={done ? colors.white : colors.tealDark} />
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
          {showOptional && (
            <View style={styles.optionalTag}>
              <Text style={styles.optionalTagText}>Optional</Text>
            </View>
          )}
        </View>
        <Text style={[styles.description, done && styles.descriptionDone]}>{description}</Text>
        {/* Only show a status badge once something's actually happened. On an
            all-optional hub, stamping "Not started" on every untouched row reads
            as anxiety, not information — the chevron already invites the tap. */}
        {(state === "in_progress" || done) && (
          <View style={[styles.statusBadge, done && styles.statusBadgeDone]}>
            <Text style={[styles.statusText, done && styles.statusTextDone]}>
              {STATUS_LABEL[state]}
            </Text>
          </View>
        )}
      </View>

      {locked ? (
        <Lock size={18} color={colors.inkMuted} />
      ) : done ? (
        <Check size={20} color={colors.white} />
      ) : (
        <ChevronRight size={20} color={colors.inkMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  rowDone: {
    backgroundColor: colors.teal,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleDone: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  info: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 2,
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  optionalTag: {
    borderRadius: radii.full,
    paddingVertical: 1,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  optionalTagText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
  },
  titleDone: { color: colors.white },
  description: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginBottom: spacing.xs,
  },
  descriptionDone: { color: "rgba(255,255,255,0.75)" },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  statusBadgeDone: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
  },
  statusTextDone: { color: colors.white },
});
