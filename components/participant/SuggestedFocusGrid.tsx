import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Footprints, Moon, Wind, Utensils, Dumbbell, Apple, Sparkles, type LucideIcon } from "lucide-react-native";
import {
  colors,
  fontSizes,
  fontWeights,
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

export function SuggestedFocusGrid({ items }: SuggestedFocusGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => {
        const Icon = iconFor(item);
        return (
          <View key={index} style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon size={18} color={colors.sage} />
            </View>
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
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    margin: "1%",
    ...shadows.card,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.charcoal,
  },
});
