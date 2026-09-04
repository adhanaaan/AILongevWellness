import React, { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import { Card } from "@/components/ui/Card";
import { TrendSparkline } from "@/components/participant/TrendSparkline";
import type { BiomarkerReading } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export interface TrendCardProps {
  label: string;
  unit: string;
  /** Chronological readings, oldest first. Assumes length >= 2. */
  readings: BiomarkerReading[];
  /** Line + fill hue (pillar color or sage), from tokens only. */
  color: string;
}

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// measured_at is a plain "YYYY-MM-DD" string; build a local Date to avoid the
// UTC-midnight off-by-one that date-only strings hit in timezones behind UTC.
function localDate(dateOnly: string) {
  const [y, m, d] = dateOnly.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShortDate(dateOnly: string) {
  return localDate(dateOnly).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// One biomarker's trend over time: latest value, a neutral change-since-first
// chip (direction only -- we never label a change "better"/"worse" generically,
// since that depends on the marker), and a calm sparkline with the healthy band.
export function TrendCard({ label, unit, readings, color }: TrendCardProps) {
  const [width, setWidth] = useState(0);

  const first = readings[0];
  const last = readings[readings.length - 1];
  const values = readings.map((r) => r.value);
  const timestamps = readings.map((r) => localDate(r.measured_at).getTime());
  const delta = last.value - first.value;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaLabel =
    delta === 0
      ? "No change"
      : `${arrow} ${formatNum(Math.abs(delta))} ${unit} since ${formatShortDate(first.measured_at)}`;

  // Reference band uses the latest reading's range (ranges rarely move between
  // labs); shown only when a numeric band exists.
  const refLow = last.ref_low;
  const refHigh = last.ref_high;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.labelWrap}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>
          {formatNum(last.value)}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
      </View>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {width > 0 && (
          <TrendSparkline
            values={values}
            timestamps={timestamps}
            color={color}
            refLow={refLow}
            refHigh={refHigh}
            width={width}
            height={92}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.delta}>{deltaLabel}</Text>
        <Text style={styles.count}>{readings.length} readings</Text>
      </View>
      {refLow != null && refHigh != null && refHigh > refLow && (
        <Text style={styles.bandNote}>
          Shaded band shows the optimal range ({formatNum(refLow)}–{formatNum(refHigh)} {unit}).
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    flexShrink: 0,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    flexShrink: 1,
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
  chartWrap: {
    width: "100%",
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  delta: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  count: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
  },
  bandNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
