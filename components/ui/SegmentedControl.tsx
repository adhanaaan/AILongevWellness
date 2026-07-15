import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights, radii, shadows, spacing } from "@/lib/theme/tokens";

export interface SegmentOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.inkMuted,
  },
  labelActive: {
    color: colors.sageDark,
    fontWeight: fontWeights.semibold,
  },
});
