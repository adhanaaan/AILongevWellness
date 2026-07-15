import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface ChipProps {
  selected?: boolean;
  onToggle?: () => void;
  children: string;
}

export function Chip({ selected = false, onToggle, children }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.container, selected ? styles.selected : styles.unselected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  selected: {
    backgroundColor: colors.sage,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  text: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
  },
  selectedText: {
    color: colors.white,
  },
  unselectedText: {
    color: colors.charcoal,
  },
});
