import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles } from "lucide-react-native";
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

export function SuggestedFocusGrid({ items }: SuggestedFocusGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.iconCircle}>
            <Sparkles size={18} color={colors.sage} />
          </View>
          <Text style={styles.label}>{item}</Text>
        </View>
      ))}
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
