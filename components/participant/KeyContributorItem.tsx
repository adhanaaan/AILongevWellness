import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamilies, fontSizes, lineHeights, radii, shadows, spacing } from "@/lib/theme/tokens";

export interface KeyContributorItemProps {
  text: string;
  tone: "good" | "monitor";
}

// Guideline bodies that may already appear, verbatim, inside the verified
// contributor text (from lib/methodology/content.ts-grounded generation and the
// hand-authored demo draft). We ONLY emphasize names that literally occur in the
// text — nothing is invented or attached. Longest patterns first so "ACC/AHA"
// wins over "AHA".
const GUIDELINE_NAMES = [
  "ACC/AHA",
  "NCEP ATP III",
  "National Lipid Association",
  "American Diabetes Association",
  "American Heart Association",
  "World Health Organization",
  "KDIGO",
  "NCEP",
  "IDF",
  "ADA",
  "AHA",
  "WHO",
  "NIH",
  "ATA",
  "ACE",
];

const GUIDELINE_RE = new RegExp(
  `(${GUIDELINE_NAMES.map((n) => n.replace(/[/]/g, "\\/")).join("|")})`,
  "g"
);

// Split the sentence into plain + emphasized spans so a named source reads with
// quiet authority (bodySemiBold, full-ink) inside the muted body copy.
function renderWithSources(text: string) {
  const parts = text.split(GUIDELINE_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={styles.source}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

// Calm-clinical contributor row: a clean surface card with a small tone dot and
// a quiet status caption, rather than the old full-bleed sage/terracotta pill.
// Restrained enough to read as a medical finding, warm enough to stay human.
export function KeyContributorItem({ text, tone }: KeyContributorItemProps) {
  const isGood = tone === "good";
  const dotColor = isGood ? colors.sage : colors.terracotta;
  const statusLabel = isGood ? "In range" : "Monitor";

  return (
    <View style={styles.row}>
      <View style={styles.markerColumn}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.status, { color: dotColor }]}>{statusLabel}</Text>
        <Text style={styles.text}>{renderWithSources(text)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  markerColumn: {
    width: 14,
    alignItems: "center",
    paddingTop: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
  },
  status: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  text: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    lineHeight: lineHeights.bodyMd,
    color: colors.charcoal,
  },
  source: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.ink,
  },
});
