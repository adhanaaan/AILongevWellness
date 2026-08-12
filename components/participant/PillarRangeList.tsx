import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { HeartPulse, Flame, Brain, ChevronRight, type LucideIcon } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { RangeBar } from "@/components/ui/RangeBar";
import { PILLAR_STATUS_THRESHOLD } from "@/lib/ai/scoring";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface PillarRangeItem {
  key: string;
  label: string;
  value: number;
  status: "good" | "monitor";
  onPress?: () => void;
  accessibilityLabel?: string;
}

export interface PillarRangeListProps {
  items: PillarRangeItem[];
}

const PILLAR_META: Record<string, { Icon: LucideIcon; tint: string; icon: string; caption: string }> = {
  vascular: { Icon: HeartPulse, tint: colors.vascularLighter, icon: colors.vascularDark, caption: "Heart & circulation" },
  metabolic: { Icon: Flame, tint: colors.metabolicLighter, icon: colors.metabolicDark, caption: "Energy & metabolism" },
  mental: { Icon: Brain, tint: colors.mentalLighter, icon: colors.mentalDark, caption: "Cognition & stress" },
};

// Superpower-style range rows: each pillar shows where its 0-100 score sits
// against the optimal band (>= PILLAR_STATUS_THRESHOLD), not just a bare ring.
// The band is always the "optimal" green; the marker takes the status color, so
// a monitor pillar reads as a terracotta dot sitting left of the green zone.
function PillarRow({ item }: { item: PillarRangeItem }) {
  const meta = PILLAR_META[item.key];
  const statusColor = item.status === "good" ? colors.sage : colors.terracotta;
  const Icon = meta?.Icon;

  const body = (
    <Card padding="lg" style={styles.card}>
      <View style={styles.headerRow}>
        {Icon && meta && (
          <View style={[styles.iconCircle, { backgroundColor: meta.tint }]}>
            <Icon size={18} color={meta.icon} />
          </View>
        )}
        <View style={styles.headingText}>
          <Text style={styles.label}>{item.label}</Text>
          {meta && <Text style={styles.caption}>{meta.caption}</Text>}
        </View>
        <View style={styles.valueBlock}>
          <Text style={styles.value}>{item.value}</Text>
          <View style={[styles.statusPill, { backgroundColor: withStatusTint(item.status) }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status === "good" ? "Optimal" : "Monitor"}
            </Text>
          </View>
        </View>
        {item.onPress && <ChevronRight size={18} color={colors.inkMuted} />}
      </View>

      <View style={styles.barRow}>
        <RangeBar
          value={item.value}
          zoneStart={PILLAR_STATUS_THRESHOLD}
          zoneEnd={100}
          color={colors.sage}
          markerColor={statusColor}
        />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Monitor</Text>
        <Text style={styles.scaleLabel}>Optimal</Text>
      </View>
    </Card>
  );

  if (!item.onPress) return body;

  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
    >
      {body}
    </Pressable>
  );
}

function withStatusTint(status: "good" | "monitor"): string {
  return status === "good" ? colors.sageTint : colors.terracottaTint;
}

export function PillarRangeList({ items }: PillarRangeListProps) {
  const interactive = items.some((i) => i.onPress);
  return (
    <View>
      <Text style={styles.title}>Your pillar scores</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <PillarRow key={item.key} item={item} />
        ))}
      </View>
      {interactive && <Text style={styles.footnote}>Tap a pillar to see what's driving it</Text>}
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
  list: { gap: spacing.md },
  card: {},
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: { flex: 1 },
  label: {
    fontSize: fontSizes.bodyLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  caption: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 1,
  },
  valueBlock: { alignItems: "flex-end", gap: 4 },
  value: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
    lineHeight: fontSizes.headlineMd,
  },
  statusPill: {
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.overline,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  barRow: { marginTop: spacing.lg },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  scaleLabel: {
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
  },
  footnote: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
