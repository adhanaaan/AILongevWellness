import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { PressableScale } from "@/components/ui/PressableScale";
import { RangeBar } from "@/components/ui/RangeBar";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface PillarScoreCardProps {
  name: string;
  /** 0-100 score, or null when the pillar has no captured data yet. */
  score: number | null;
  status: "good" | "monitor";
  /** Pillar accent (the coloured dot). */
  color: string;
  onPress: () => void;
}

// The "ideal" band for a 0-100 pillar score — 70+ reads as on track, matching
// pillarStatus(). Drawn on every card so the number is always plotted against
// the target, per retreat feedback ("plot against ideal").
const IDEAL_START = 70;

// Prominent-number pillar card: name (header) + big score + a range bar showing
// where the score sits against the ideal band; tap opens the full detail
// ("header + number -> click to read the rest"). When a pillar has no data yet,
// it shows a preview — the ideal band and a muted placeholder — so the value's
// shape is visible before the data is ("placeholders to show the value").
export function PillarScoreCard({ name, score, status, color, onPress }: PillarScoreCardProps) {
  const hasData = score !== null;
  const markerColor = status === "good" ? colors.success : colors.terracotta;

  return (
    <PressableScale
      style={styles.card}
      onPress={onPress}
      haptics="selection"
      accessibilityRole="button"
      accessibilityLabel={
        hasData ? `${name} score ${score} out of 100. Tap for detail.` : `${name} not assessed yet. Tap to add data.`
      }
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.name}>{name}</Text>
        {hasData ? (
          <View style={[styles.pill, status === "good" ? styles.pillGood : styles.pillMonitor]}>
            <Text style={[styles.pillText, status === "good" ? styles.pillTextGood : styles.pillTextMonitor]}>
              {status === "good" ? "On track" : "Monitor"}
            </Text>
          </View>
        ) : (
          <View style={[styles.pill, styles.pillMuted]}>
            <Text style={[styles.pillText, styles.pillTextMuted]}>Not assessed</Text>
          </View>
        )}
        {hasData ? (
          <Text style={styles.num}>{score}</Text>
        ) : (
          <Text style={[styles.num, styles.numMuted]}>–</Text>
        )}
        <ChevronRight size={20} color={colors.inkMuted} style={styles.chev} />
      </View>

      <View style={styles.barWrap}>
        <RangeBar
          value={hasData ? (score as number) : 82}
          min={0}
          max={100}
          zoneStart={IDEAL_START}
          zoneEnd={100}
          color={colors.sage}
          markerColor={hasData ? markerColor : colors.border}
          height={9}
        />
        <View style={styles.caps}>
          <Text style={styles.capMuted}>0</Text>
          <Text style={styles.capIdeal}>ideal 70–100</Text>
          <Text style={styles.capMuted}>100</Text>
        </View>
      </View>

      {!hasData && (
        <Text style={styles.previewNote}>Add {name.toLowerCase()} data to reveal your score.</Text>
      )}
    </PressableScale>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 11, height: 11, borderRadius: radii.full, flexShrink: 0 },
  name: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.ink,
  },
  pill: { borderRadius: radii.full, paddingVertical: 3, paddingHorizontal: spacing.sm, marginLeft: spacing.xs },
  pillGood: { backgroundColor: colors.tealTint },
  pillMonitor: { backgroundColor: colors.terracottaTint },
  pillMuted: { backgroundColor: colors.surfaceMuted },
  pillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pillTextGood: { color: colors.sageDark },
  pillTextMonitor: { color: colors.terracottaInk },
  pillTextMuted: { color: colors.inkMuted },
  num: {
    marginLeft: "auto",
    fontFamily: fontFamilies.displayBold,
    fontSize: 34,
    lineHeight: 36,
    color: colors.ink,
    includeFontPadding: false,
  },
  numMuted: { color: colors.borderStrong },
  chev: { marginLeft: spacing.xs },
  barWrap: { marginTop: spacing.md },
  caps: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  capMuted: { fontFamily: fontFamilies.body, fontSize: fontSizes.overline, color: colors.inkMuted },
  capIdeal: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.overline, color: colors.sageDark },
  previewNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.md,
  },
});
