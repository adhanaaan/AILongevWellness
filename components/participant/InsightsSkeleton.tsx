import React from "react";
import { View, StyleSheet } from "react-native";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { radii, spacing } from "@/lib/theme/tokens";

/**
 * Mirrors the real Insights tab's shape (title, status pill, biological-age
 * hero, pillar strip, contributor list) so the loading moment previews the
 * layout that's about to fill in, instead of a spinner with no relation to
 * what's coming -- the pattern Grab/AllTrails/Careem all use.
 */
export function InsightsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBlock width="70%" height={28} />
      <SkeletonBlock width="40%" height={14} style={styles.spaceSm} />
      <SkeletonBlock width="55%" height={28} radius={radii.full} style={styles.spaceMd} />

      <SkeletonBlock height={140} radius={radii.xl} style={styles.spaceLg} />

      <View style={[styles.row, styles.spaceLg]}>
        <SkeletonBlock width={72} height={72} radius={radii.full} />
        <SkeletonBlock width={72} height={72} radius={radii.full} />
        <SkeletonBlock width={72} height={72} radius={radii.full} />
      </View>

      <View style={styles.spaceLg}>
        <SkeletonBlock height={48} radius={radii.sm} style={styles.spaceSm} />
        <SkeletonBlock height={48} radius={radii.sm} style={styles.spaceSm} />
        <SkeletonBlock height={48} radius={radii.sm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  spaceSm: { marginTop: spacing.sm },
  spaceMd: { marginTop: spacing.md },
  spaceLg: { marginTop: spacing.xl },
});
