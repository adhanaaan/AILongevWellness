import React from "react";
import { View, StyleSheet } from "react-native";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { colors, radii, spacing } from "@/lib/theme/tokens";

/**
 * Mirrors ParticipantTableRow's column layout (name + meta, progress bar,
 * status pill, chevron) so the admin list previews real row shape while
 * listParticipants() is in flight, instead of a false "no participants"
 * empty state flashing before the real data arrives.
 */
export function TableRowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={styles.nameCol}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="40%" height={11} style={styles.metaGap} />
      </View>
      <View style={styles.progressCol}>
        <SkeletonBlock height={8} radius={radii.full} />
      </View>
      <View style={styles.statusCol}>
        <SkeletonBlock width={90} height={22} radius={radii.full} />
      </View>
      <View style={styles.chevronCol}>
        <SkeletonBlock width={20} height={20} radius={radii.full} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameCol: { flex: 2, marginRight: spacing.md },
  metaGap: { marginTop: spacing.xs },
  progressCol: { flex: 2, marginRight: spacing.md },
  statusCol: { flex: 2, marginRight: spacing.md },
  chevronCol: { width: 24, alignItems: "center" },
});
