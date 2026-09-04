import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TrendCard } from "@/components/participant/TrendCard";
import { TrendEmptyState } from "@/components/participant/TrendEmptyState";
import type { Biomarker, BiomarkerReading } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface TrendSectionProps {
  /** Every historical reading for the participant (all keys). */
  history: BiomarkerReading[];
  /** Marker keys that belong to this pillar. */
  pillarKeys: string[];
  /** Current snapshot, used for human-readable labels + units. */
  biomarkers: Biomarker[];
  /** Pillar hue for the lines, from tokens. */
  color: string;
}

// Builds per-marker trend cards from the REAL reading history -- only for keys
// with >= 2 readings. Never interpolates or invents points: if nothing has two
// readings yet, it shows a single honest empty state instead of a fake chart.
export function TrendSection({ history, pillarKeys, biomarkers, color }: TrendSectionProps) {
  const keySet = new Set(pillarKeys);

  // Group this pillar's readings by key, oldest first.
  const byKey = new Map<string, BiomarkerReading[]>();
  for (const r of history) {
    if (!keySet.has(r.key)) continue;
    const arr = byKey.get(r.key) ?? [];
    arr.push(r);
    byKey.set(r.key, arr);
  }
  for (const arr of byKey.values()) {
    arr.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  }

  const labelFor = (key: string) =>
    biomarkers.find((b) => b.key === key)?.label ??
    key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const unitFor = (key: string, readings: BiomarkerReading[]) =>
    biomarkers.find((b) => b.key === key)?.unit ?? readings[readings.length - 1].unit ?? "";

  const series = Array.from(byKey.entries())
    .filter(([, readings]) => readings.length >= 2)
    // Most recently measured series first.
    .sort((a, b) => b[1][b[1].length - 1].measured_at.localeCompare(a[1][a[1].length - 1].measured_at));

  return (
    <View style={styles.section}>
      <Text style={styles.overline}>Trends over time</Text>
      {series.length > 0 ? (
        <>
          <View style={styles.list}>
            {series.map(([key, readings]) => (
              <TrendCard
                key={key}
                label={labelFor(key)}
                unit={unitFor(key, readings)}
                readings={readings}
                color={color}
              />
            ))}
          </View>
          <Text style={styles.caption}>Charted from your first reading. More markers appear here as you re-test over time.</Text>
        </>
      ) : (
        <TrendEmptyState
          message="We'll chart each marker here once you have two or more readings — nothing is estimated in between. Re-testing over time is what builds the trend."
          color={color}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing["2xl"],
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    marginTop: spacing.md,
  },
});
