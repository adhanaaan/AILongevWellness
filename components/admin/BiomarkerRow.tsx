import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { Button } from "@/components/ui";
import { RangeBar } from "@/components/ui/RangeBar";
import { colors, fontFamilies, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { updateBiomarkerAction } from "@/lib/data/actions";
import type { Biomarker } from "@/lib/types/db";

type Trend = "up" | "down" | "flat";

interface BiomarkerRowProps {
  biomarker: Biomarker;
  participantId: string;
  trend: Trend;
  editable: boolean;
}

const trendIcons: Record<Trend, React.ReactNode> = {
  up: <TrendingUp size={16} color={colors.terracottaInk} />,
  down: <TrendingDown size={16} color={colors.sageDark} />,
  flat: <Minus size={16} color={colors.inkMuted} />,
};

const sourceColors: Record<string, { bg: string; text: string }> = {
  manual: { bg: colors.surfaceMuted, text: colors.inkMuted },
  wearable: { bg: colors.sageTint, text: colors.sageDark },
  lab_extract: { bg: colors.terracottaTint, text: colors.terracottaInk },
  body_comp: { bg: colors.surfaceMuted, text: colors.charcoal },
  recognize: { bg: colors.sageTint, text: colors.sageDark },
  admin: { bg: colors.surfaceMuted, text: colors.charcoal },
};

// Pads the track a little beyond the reference band (and beyond the value, if it
// sits outside) so the marker is always visible with the healthy zone for
// context. Mirrors the participant-side BiomarkerRangeRow scale exactly.
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

// Admin biomarker row, restyled to the participant register: the value shown as
// a marker on its own reference range with the optimal band highlighted
// (mirroring BiomarkerRangeRow), while keeping the clinician's inline edit,
// source provenance pill, and trend indicator fully intact. Editing collapses
// the range visual into a focused numeric input, exactly as before.
export function BiomarkerRow({
  biomarker,
  participantId,
  trend,
  editable,
}: BiomarkerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    biomarker.value !== null ? String(biomarker.value) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFlagged = biomarker.flagged;
  const markerColor = isFlagged ? colors.terracotta : colors.sage;
  const hasRange =
    biomarker.value !== null &&
    biomarker.ref_low !== null &&
    biomarker.ref_high !== null &&
    biomarker.ref_high > biomarker.ref_low;

  const sourcePalette = sourceColors[biomarker.source] ?? sourceColors.manual;

  const handleSave = async () => {
    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue)) {
      setError("Enter a valid number.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateBiomarkerAction(participantId, biomarker.id, {
        value: numericValue,
      });
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(biomarker.value !== null ? String(biomarker.value) : "");
    setError(null);
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelWrap}>
          <View style={[styles.dot, { backgroundColor: markerColor }]} />
          <Text style={styles.label}>{biomarker.label}</Text>
        </View>

        {isEditing ? (
          <TextInput
            style={styles.input}
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="numeric"
            autoFocus
          />
        ) : (
          <View style={styles.valueWrap}>
            <Text style={styles.value}>
              {biomarker.value !== null ? formatNum(biomarker.value) : "—"}
              <Text style={styles.unit}> {biomarker.unit}</Text>
            </Text>
            {isFlagged && (
              <View style={styles.flagPill}>
                <Text style={styles.flagPillText}>Out of range</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {!isEditing && hasRange && (
        <>
          <View style={styles.barRow}>
            <RangeBar
              value={biomarker.value!}
              min={computeScale(biomarker.value!, biomarker.ref_low!, biomarker.ref_high!).min}
              max={computeScale(biomarker.value!, biomarker.ref_low!, biomarker.ref_high!).max}
              zoneStart={biomarker.ref_low!}
              zoneEnd={biomarker.ref_high!}
              color={colors.sage}
              markerColor={markerColor}
            />
          </View>
          <Text style={styles.refLabel}>
            Optimal {formatNum(biomarker.ref_low!)}–{formatNum(biomarker.ref_high!)} {biomarker.unit}
          </Text>
        </>
      )}

      <View style={styles.metaRow}>
        <View style={styles.sourcePill}>
          <Text
            style={[
              styles.sourceText,
              { backgroundColor: sourcePalette.bg, color: sourcePalette.text },
            ]}
          >
            {biomarker.source.replace("_", " ")}
          </Text>
        </View>
        <View style={styles.trendCol}>{trendIcons[trend]}</View>
        <View style={styles.metaSpacer} />
        {editable &&
          (isEditing ? (
            <View style={styles.actions}>
              <Button variant="primary" size="sm" onPress={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onPress={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </View>
          ) : (
            <Button variant="ghost" size="sm" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
          ))}
      </View>

      {isEditing && error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
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
  barRow: {
    marginTop: spacing.lg,
  },
  refLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    backgroundColor: colors.surface,
    minWidth: 96,
    textAlign: "right",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sourcePill: {},
  sourceText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  trendCol: {
    width: 24,
    alignItems: "center",
  },
  metaSpacer: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  error: {
    fontSize: fontSizes.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
