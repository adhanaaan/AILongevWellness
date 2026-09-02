import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RangeBar } from "@/components/ui/RangeBar";
import { biomarkerLabel, biomarkerCatalogEntry } from "@/lib/ai/biomarkerLabels";
import type { OutOfRangeBiomarker } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

// A flagged marker from aiDraft.out_of_range, shown as a plotted card: a
// prominent value with a marker on its range against the ideal band, plus one
// line of context — instead of the number buried in a sentence. Uses the marker's
// `side` (which bound it crossed) so a one-directional marker like LDL reads
// "ideal ≤3.0", not an invented "1–3" floor.
export interface MonitorMetricCardProps {
  item: OutOfRangeBiomarker;
}

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function MonitorMetricCard({ item }: MonitorMetricCardProps) {
  const entry = biomarkerCatalogEntry(item.key);
  const label = biomarkerLabel(item.key);
  const unit = entry?.unit ?? "";
  const refHigh = item.ref_high ?? entry?.ref_high ?? null;
  const refLow = item.ref_low ?? entry?.ref_low ?? null;
  const value = item.value;
  const side: "low" | "high" =
    item.side ?? (refHigh !== null && value > refHigh ? "high" : "low");

  // Scale padded around the reference band and the value so the marker shows.
  const anchorLow = refLow ?? (refHigh !== null ? refHigh * 0.5 : value * 0.5);
  const anchorHigh = refHigh ?? (refLow ?? value);
  const span = anchorHigh - anchorLow || Math.abs(anchorHigh) || 1;
  const min = Math.min(anchorLow - span * 0.4, value - span * 0.15);
  const max = Math.max(anchorHigh + span * 0.4, value + span * 0.15);

  // The healthy zone is one-sided per which bound was crossed.
  const zoneStart = side === "high" ? min : (refLow ?? min);
  const zoneEnd = side === "high" ? (refHigh ?? max) : max;

  const idealLabel =
    side === "high" && refHigh !== null
      ? `Ideal ≤${formatNum(refHigh)} ${unit}`
      : side === "low" && refLow !== null
        ? `Ideal ≥${formatNum(refLow)} ${unit}`
        : "";

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Monitor</Text>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {formatNum(value)}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
      </View>

      {refHigh !== null && refLow !== null && (
        <View style={styles.barWrap}>
          <RangeBar
            value={value}
            min={min}
            max={max}
            zoneStart={zoneStart}
            zoneEnd={zoneEnd}
            color={colors.sage}
            markerColor={colors.terracotta}
            height={8}
          />
          {idealLabel ? <Text style={styles.caption}>{idealLabel}</Text> : null}
        </View>
      )}

      <Text style={styles.note}>
        {side === "high" ? "Above your ideal range — worth monitoring." : "Below your ideal range — worth monitoring."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.terracotta,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  label: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.ink,
    flexShrink: 1,
  },
  value: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 30,
    lineHeight: 32,
    color: colors.ink,
    includeFontPadding: false,
  },
  unit: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  barWrap: { marginTop: spacing.md },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  note: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.md,
    lineHeight: 17,
  },
});
