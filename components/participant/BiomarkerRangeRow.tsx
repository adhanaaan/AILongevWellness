import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { RangeBar } from "@/components/ui/RangeBar";
import { MARKER_DIRECTION } from "@/lib/ai/markerDirection";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface BiomarkerRangeRowProps {
  label: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  /** True when the value falls outside the reference range. */
  flagged: boolean;
  /** Optional plain-English trend line, e.g. "↓ 3 since Jun 12". */
  trend?: string | null;
  /** Marker key, so a one-directional marker (e.g. LDL) shows a one-sided
   *  optimal ("≤3.0") instead of an invented "1–3" floor. */
  markerKey?: string;
}

// The "optimal" caption, one-sided for markers that only have one bad bound.
function optimalLabel(markerKey: string | undefined, low: number, high: number, unit: string): string {
  const dir = markerKey ? MARKER_DIRECTION[markerKey] : undefined;
  const n = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
  if (dir === "lower") return `Optimal ≤${n(high)} ${unit}`;
  if (dir === "higher") return `Optimal ≥${n(low)} ${unit}`;
  return `Optimal ${n(low)}–${n(high)} ${unit}`;
}

// Pads the track a little beyond the reference band (and beyond the value, if it
// sits outside) so the marker is always visible with the healthy zone for context.
function computeScale(value: number, low: number, high: number) {
  const span = high - low || Math.abs(high) || 1;
  const pad = span * 0.5;
  let min = low - pad;
  let max = high + pad;
  min = Math.min(min, value - span * 0.15);
  max = Math.max(max, value + span * 0.15);
  return { min, max };
}

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// Superpower-style biomarker row: the value shown as a marker on its own
// reference range, with the in-range band highlighted -- far more legible than
// a bare "Ref: 40-160" line. Markers without a numeric reference range fall back
// to a plain value row (no bar), rather than inventing bounds.
export function BiomarkerRangeRow({ label, value, unit, refLow, refHigh, flagged, trend, markerKey }: BiomarkerRangeRowProps) {
  const hasRange = refLow !== null && refHigh !== null && refHigh > refLow;
  const markerColor = flagged ? colors.terracotta : colors.sage;

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.labelWrap}>
          <View style={[styles.dot, { backgroundColor: markerColor }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.valueWrap}>
          <Text style={styles.value}>
            {formatNum(value)}
            <Text style={styles.unit}> {unit}</Text>
          </Text>
          {flagged && (
            <View style={styles.flagPill}>
              <Text style={styles.flagPillText}>Out of range</Text>
            </View>
          )}
        </View>
      </View>

      {hasRange ? (
        <>
          <View style={styles.barRow}>
            <RangeBar
              value={value}
              min={computeScale(value, refLow, refHigh).min}
              max={computeScale(value, refLow, refHigh).max}
              zoneStart={refLow}
              zoneEnd={refHigh}
              color={colors.sage}
              markerColor={markerColor}
            />
          </View>
          <View style={styles.footer}>
            <Text style={styles.refLabel}>
              {optimalLabel(markerKey, refLow, refHigh, unit)}
            </Text>
            {trend ? <Text style={styles.trend}>{trend}</Text> : null}
          </View>
        </>
      ) : (
        trend ? <Text style={[styles.trend, styles.trendSolo]}>{trend}</Text> : null
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    paddingTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    flexShrink: 1,
  },
  valueWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  value: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  unit: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
  },
  flagPill: {
    backgroundColor: colors.terracottaTint,
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  flagPillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    fontWeight: fontWeights.bold,
    color: colors.terracottaInk,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  barRow: { marginTop: spacing.lg },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  refLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  trend: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  trendSolo: { marginTop: spacing.md },
});
