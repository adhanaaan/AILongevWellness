import React from "react";
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native";
import { Sparkles } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, fontWeights, radii, shadows, spacing } from "@/lib/theme/tokens";

export interface SuggestionChipsProps {
  items: string[];
  onPick: (item: string) => void;
}

export function SuggestionChips({ items, onPick }: SuggestionChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.chip}
          onPress={() => onPick(item)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={item}
        >
          <View style={styles.iconDot}>
            <Sparkles size={11} color={colors.sage} />
          </View>
          <Text style={styles.chipText} numberOfLines={1}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingLeft: 0,
    paddingRight: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingVertical: spacing.sm + 1,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.lg,
    ...shadows.card,
  },
  iconDot: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.sageDark,
    letterSpacing: -0.1,
  },
});
