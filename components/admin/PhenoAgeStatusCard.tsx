import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlaskConical } from "lucide-react-native";
import { Card } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";
import { missingPhenoAgeInputs } from "@/lib/ai/phenoAge";
import { LAB_CATALOG_BY_KEY } from "@/lib/ai/labCatalog";
import type { Biomarker } from "@/lib/types/db";

interface PhenoAgeStatusCardProps {
  biomarkers: Biomarker[];
}

/**
 * Surfaces which of PhenoAge's 9 required inputs are still missing for this
 * participant, so staff can tell whether a repeat draw or a different lab
 * vendor is needed -- without this, "biological age is using the fallback"
 * was only visible to the participant, indirectly, on the bio-age page.
 */
export function PhenoAgeStatusCard({ biomarkers }: PhenoAgeStatusCardProps) {
  const missing = missingPhenoAgeInputs(biomarkers);
  const complete = missing.length === 0;

  return (
    <Card style={complete ? styles.cardComplete : undefined}>
      <View style={styles.row}>
        <FlaskConical size={18} color={complete ? colors.sageDark : colors.inkMuted} />
        <View style={styles.content}>
          <Text style={styles.title}>
            {complete ? "PhenoAge: all 9 inputs captured" : `PhenoAge: ${9 - missing.length} of 9 inputs captured`}
          </Text>
          {complete ? (
            <Text style={styles.body}>Biological age is using the real published PhenoAge formula.</Text>
          ) : (
            <Text style={styles.body}>
              Still missing: {missing.map((k) => LAB_CATALOG_BY_KEY[k]?.label ?? k).join(", ")}. Biological age is
              using the fallback composite estimate until these are captured.
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardComplete: {
    backgroundColor: colors.sageTint,
    borderColor: colors.sage,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  body: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
