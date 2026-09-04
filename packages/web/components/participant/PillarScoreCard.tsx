import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { RangeBar } from "@/components/ui/RangeBar";
import { biomarkerCatalogEntry } from "@/lib/ai/biomarkerLabels";
import type { Biomarker } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface PillarScoreCardProps {
  name: string;
  /** 0-100 score, or null when the pillar has no captured data yet. */
  score: number | null;
  status: "good" | "monitor";
  /** Pillar accent (the coloured dot). */
  color: string;
  /** Captured biomarkers for this pillar (shown when expanded). */
  markers: Biomarker[];
  /** Keys of this pillar's not-yet-captured markers (shown as previews). */
  previewKeys: string[];
  /** Open the full pillar detail page (trends, age clock, Ask Ava). */
  onOpenDetail: () => void;
}

// The "ideal" band for a 0-100 pillar score — 70+ reads as on track, matching
// pillarStatus().
const IDEAL_START = 70;

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// A padded scale around a marker's reference band so the marker is always visible.
function scaleFor(low: number, high: number) {
  const span = high - low || Math.abs(high) || 1;
  return { min: low - span * 0.5, max: high + span * 0.5, span };
}

// One captured or preview metric, as a compact row inside the expanded card.
function MetricRow({
  label,
  value,
  unit,
  refLow,
  refHigh,
  flagged,
  preview,
}: {
  label: string;
  value: number | null;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flagged: boolean;
  preview?: boolean;
}) {
  const hasRange = refLow !== null && refHigh !== null && refHigh > refLow;
  const markerColor = preview ? colors.borderStrong : flagged ? colors.terracotta : colors.success;
  const s = hasRange ? scaleFor(refLow as number, refHigh as number) : null;
  return (
    <View style={[styles.mrow, preview && styles.mrowPreview]}>
      <View style={styles.mtop}>
        <Text style={styles.mlabel}>{label}</Text>
        <Text style={[styles.mval, preview && styles.mvalMuted]}>
          {value === null ? "–" : formatNum(value)}
          <Text style={styles.munit}> {unit}</Text>
        </Text>
      </View>
      {hasRange && s && (
        <View style={styles.mbar}>
          <RangeBar
            value={value === null ? (refLow! + refHigh!) / 2 : value}
            min={s.min}
            max={s.max}
            zoneStart={refLow as number}
            zoneEnd={refHigh as number}
            color={colors.sage}
            markerColor={markerColor}
            height={7}
          />
          <Text style={styles.mcap}>
            Optimal {formatNum(refLow as number)}–{formatNum(refHigh as number)} {unit}
          </Text>
        </View>
      )}
    </View>
  );
}

// Prominent-number pillar card that EXPANDS in place: name (header) + big score +
// a range bar showing where the score sits against the ideal band; tap the header
// to reveal each marker plotted against its own ideal band — captured values in
// colour, not-yet-captured ones as dimmed previews (so the value's shape shows
// before the data does). "See full detail" opens the pillar page for trends,
// the age clock and Ask Ava.
export function PillarScoreCard({ name, score, status, color, markers, previewKeys, onOpenDetail }: PillarScoreCardProps) {
  const [open, setOpen] = useState(false);
  const hasData = score !== null;
  const markerColor = status === "good" ? colors.success : colors.terracotta;
  const previews = previewKeys
    .map((k) => biomarkerCatalogEntry(k))
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.headerPress}
        accessibilityRole="button"
        accessibilityLabel={
          hasData
            ? `${name} score ${score} out of 100. Tap to ${open ? "collapse" : "expand"}.`
            : `${name} not assessed yet. Tap to ${open ? "collapse" : "expand"}.`
        }
      >
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.name}>{name}</Text>
          <View style={[styles.pill, hasData ? (status === "good" ? styles.pillGood : styles.pillMonitor) : styles.pillMuted]}>
            <Text
              style={[
                styles.pillText,
                hasData ? (status === "good" ? styles.pillTextGood : styles.pillTextMonitor) : styles.pillTextMuted,
              ]}
            >
              {hasData ? (status === "good" ? "On track" : "Monitor") : "Not assessed"}
            </Text>
          </View>
          <Text style={[styles.num, !hasData && styles.numMuted]}>{hasData ? score : "–"}</Text>
          <ChevronDown
            size={20}
            color={colors.inkMuted}
            style={[styles.chev, open && styles.chevOpen]}
          />
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

        {!hasData && !open && (
          <Text style={styles.previewNote}>Add {name.toLowerCase()} data to reveal your score.</Text>
        )}
      </Pressable>

      {open && (
        <View style={styles.detail}>
          {markers.map((b) => (
            <MetricRow
              key={b.id}
              label={b.label}
              value={b.value as number}
              unit={b.unit}
              refLow={b.ref_low}
              refHigh={b.ref_high}
              flagged={b.flagged}
            />
          ))}
          {previews.map((e) => (
            <MetricRow
              key={e.key}
              label={e.label}
              value={null}
              unit={e.unit}
              refLow={e.ref_low}
              refHigh={e.ref_high}
              flagged={false}
              preview
            />
          ))}
          <Pressable style={styles.detailLink} onPress={onOpenDetail} accessibilityRole="button">
            <Text style={styles.detailLinkText}>{hasData ? "See full detail" : "Add data"}</Text>
            <ChevronRight size={16} color={colors.sageDark} />
          </Pressable>
        </View>
      )}
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
  headerPress: {},
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
  chevOpen: { transform: [{ rotate: "180deg" }] },
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
  detail: {
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  mrow: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  mrowPreview: { opacity: 0.65 },
  mtop: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  mlabel: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.ink, flexShrink: 1 },
  mval: {
    marginLeft: "auto",
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    color: colors.ink,
  },
  mvalMuted: { color: colors.borderStrong },
  munit: { fontFamily: fontFamilies.body, fontSize: fontSizes.overline, color: colors.inkMuted },
  mbar: { marginTop: spacing.sm },
  mcap: { fontFamily: fontFamilies.body, fontSize: fontSizes.overline, color: colors.inkMuted, marginTop: spacing.xs },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  detailLinkText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.sageDark,
  },
});
