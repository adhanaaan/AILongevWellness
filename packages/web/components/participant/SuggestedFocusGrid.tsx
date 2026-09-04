import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Footprints, Moon, Wind, Utensils, Dumbbell, Apple, Sparkles, type LucideIcon } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  shadows,
  spacing,
} from "@/lib/theme/tokens";

export interface SuggestedFocusGridProps {
  items: string[];
}

// Every focus item used to share one identical Sparkles icon regardless of
// topic — matched by keyword instead, so the grid actually looks like four
// distinct areas rather than four copies of the same tile. Falls back to
// Sparkles for any phrasing that doesn't match a known topic.
const ICON_KEYWORDS: Array<[RegExp, LucideIcon]> = [
  [/movement|activity|walk|step/i, Footprints],
  [/sleep|rest/i, Moon],
  [/stress|recovery|breath|mind/i, Wind],
  [/nutrition|diet|meal|food/i, Utensils],
  [/exercise|fitness|strength|gym/i, Dumbbell],
  [/weight|metabolic/i, Apple],
];

function iconFor(label: string): LucideIcon {
  return ICON_KEYWORDS.find(([pattern]) => pattern.test(label))?.[1] ?? Sparkles;
}

// Calm-clinical tiles: a quiet sage-tinted icon (no filled circle), soft
// surface card, no heavy border — restrained enough to read as clinical, still
// visually distinct per topic.
export function SuggestedFocusGrid({ items }: SuggestedFocusGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => {
        const Icon = iconFor(item);
        return (
          <View key={index} style={styles.card}>
            <Icon size={20} color={colors.sage} strokeWidth={1.75} style={styles.icon} />
            <Text style={styles.label}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(spacing.sm / 2),
  },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: "1%",
    ...shadows.card,
  },
  icon: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    lineHeight: lineHeights.labelMd,
    color: colors.charcoal,
  },
});
