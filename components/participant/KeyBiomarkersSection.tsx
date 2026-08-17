import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { BiomarkerRangeRow } from "@/components/participant/BiomarkerRangeRow";
import { BiomarkerSummaryBar } from "@/components/participant/BiomarkerSummaryBar";
import type { Biomarker } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface KeyBiomarkersSectionProps {
  biomarkers: Biomarker[];
  notCaptured: number;
  onSeeAll: () => void;
  /** How many range rows to preview (flagged first). */
  previewCount?: number;
}

// The Insights-tab preview of the full biomarker panel (Superpower "Data"
// pattern): the in-range/out-of-range summary, then the handful of markers most
// worth surfacing (anything flagged first, then anchor markers), each shown on
// its own reference range. Taps through to the full grouped list.
export function KeyBiomarkersSection({
  biomarkers,
  notCaptured,
  onSeeAll,
  previewCount = 3,
}: KeyBiomarkersSectionProps) {
  const captured = biomarkers.filter((b) => b.value !== null);
  if (captured.length === 0) return null;

  const inRange = captured.filter((b) => !b.flagged).length;
  const outOfRange = captured.filter((b) => b.flagged).length;

  // Flagged markers lead (an executive wants to see what's off first); fill the
  // rest with in-range anchors so the panel never reads as all-red.
  const ranked = [...captured].sort(
    (a, b) => Number(b.flagged) - Number(a.flagged) || a.label.localeCompare(b.label)
  );
  const preview = ranked.slice(0, previewCount);
  const remaining = captured.length - preview.length;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Key biomarkers</Text>
        <Pressable
          style={styles.seeAll}
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="See all biomarkers"
        >
          <Text style={styles.seeAllText}>See all {captured.length}</Text>
          <ChevronRight size={14} color={colors.sageDark} />
        </Pressable>
      </View>

      <BiomarkerSummaryBar inRange={inRange} outOfRange={outOfRange} notCaptured={notCaptured} />

      <View style={styles.rows}>
        {preview.map((b) => (
          <BiomarkerRangeRow
            key={b.id}
            label={b.label}
            value={b.value as number}
            unit={b.unit}
            refLow={b.ref_low}
            refHigh={b.ref_high}
            flagged={b.flagged}
          />
        ))}
      </View>

      {remaining > 0 && (
        <Pressable style={styles.moreRow} onPress={onSeeAll} accessibilityRole="button">
          <Text style={styles.moreText}>See {remaining} more marker{remaining === 1 ? "" : "s"}</Text>
          <ChevronRight size={16} color={colors.sageDark} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sageDark,
  },
  rows: { gap: spacing.md, marginTop: spacing.md },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  moreText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sageDark,
  },
});
