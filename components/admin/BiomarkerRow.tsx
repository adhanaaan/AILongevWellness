import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { Button } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
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

  const isFlagged = biomarker.flagged;
  const refRange =
    biomarker.ref_low !== null && biomarker.ref_high !== null
      ? `${biomarker.ref_low}–${biomarker.ref_high} ${biomarker.unit}`
      : null;

  const sourcePalette = sourceColors[biomarker.source] ?? sourceColors.manual;

  const handleSave = async () => {
    const numericValue = parseFloat(editValue);
    if (!isNaN(numericValue)) {
      await updateBiomarkerAction(participantId, biomarker.id, {
        value: numericValue,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(biomarker.value !== null ? String(biomarker.value) : "");
    setIsEditing(false);
  };

  return (
    <View style={[styles.row, isFlagged && styles.rowFlagged]}>
      <View style={styles.labelCol}>
        <Text style={[styles.label, isFlagged && styles.textFlagged]}>
          {biomarker.label}
        </Text>
        {refRange && <Text style={styles.refRange}>{refRange}</Text>}
      </View>

      <View style={styles.valueCol}>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="numeric"
            autoFocus
          />
        ) : (
          <View style={styles.valueRow}>
            <Text style={[styles.value, isFlagged && styles.textFlagged]}>
              {biomarker.value !== null ? biomarker.value : "—"}
            </Text>
            <Text style={styles.unit}>{biomarker.unit}</Text>
          </View>
        )}
      </View>

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

      {editable && (
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Button variant="primary" size="sm" onPress={handleSave}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onPress={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowFlagged: {
    backgroundColor: colors.terracottaTint,
  },
  labelCol: {
    flex: 2,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.medium,
    color: colors.charcoal,
  },
  textFlagged: {
    color: colors.terracottaInk,
  },
  refRange: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  valueCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  unit: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
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
  },
  sourcePill: {
    marginRight: spacing.sm,
  },
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
    marginRight: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
});
