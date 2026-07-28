import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { HeartPulse, Flame, Brain, type LucideIcon } from "lucide-react-native";
import { ScoreRing } from "@/components/participant/ScoreRing";
import { Card } from "@/components/ui/Card";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface PillarStripItem {
  key: string;
  label: string;
  value: number;
  status: "good" | "monitor";
  /** Omit for a non-interactive tile, e.g. the pre-review preliminary preview. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export interface PillarStripProps {
  items: PillarStripItem[];
}

// Each pillar gets its own identity color (icon + tinted backdrop) so the
// three tiles read as distinct categories rather than identical circles —
// the ring's own stroke color still carries the good/monitor signal, since
// that's the meaningful clinical read, not the pillar's brand hue.
const PILLAR_ACCENT: Record<string, { Icon: LucideIcon; tint: string; icon: string }> = {
  vascular: { Icon: HeartPulse, tint: colors.vascularLighter, icon: colors.vascularDark },
  metabolic: { Icon: Flame, tint: colors.metabolicLighter, icon: colors.metabolicDark },
  mental: { Icon: Brain, tint: colors.mentalLighter, icon: colors.mentalDark },
};

// A compact, contained strip rather than three full-size hero rings -- the
// narrative sentence above already carries the "am I okay" answer, so these
// read as the supporting receipts, not a second headline.
export function PillarStrip({ items }: PillarStripProps) {
  const interactive = items.some((item) => item.onPress);
  return (
    <View>
      <Text style={styles.title}>Your pillar scores</Text>
      <View style={styles.row}>
        {items.map((item) => {
          const accent = PILLAR_ACCENT[item.key];
          const statusColor = item.status === "good" ? colors.sage : colors.terracotta;
          const tile = (
            <Card
              padding="md"
              style={StyleSheet.flatten([styles.tile, accent && { backgroundColor: accent.tint }])}
            >
              {accent && (
                <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
                  <accent.Icon size={16} color={accent.icon} />
                </View>
              )}
              <ScoreRing value={item.value} label={item.label} status={item.status} size={68} />
              <Text style={[styles.statusWord, { color: statusColor }]}>
                {item.status === "good" ? "Strong" : "Monitor"}
              </Text>
            </Card>
          );

          if (!item.onPress) {
            return (
              <View key={item.key} style={styles.item}>
                {tile}
              </View>
            );
          }

          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              style={styles.item}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {tile}
            </Pressable>
          );
        })}
      </View>
      {interactive && <Text style={styles.caption}>Tap a score to see what's driving it</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  item: {
    flex: 1,
  },
  tile: {
    alignItems: "center",
    borderWidth: 0,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statusWord: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    marginTop: spacing.xs,
  },
  caption: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
