import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "@/lib/theme/tokens";

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  padding?: CardPadding;
  tinted?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.lg,
  lg: spacing["2xl"],
};

export function Card({
  padding = "md",
  tinted = false,
  style,
  children,
}: CardProps) {
  return (
    <View
      style={[
        styles.container,
        { padding: paddingMap[padding] },
        tinted && styles.tinted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  tinted: {
    backgroundColor: colors.sageTint,
  },
});
