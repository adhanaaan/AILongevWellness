import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { colors, radii, shadows, spacing } from "@/lib/theme/tokens";

export type GlassTint = "light" | "dark";
export type GlassPadding = "none" | "sm" | "md" | "lg";

export interface GlassCardProps {
  tint?: GlassTint;
  padding?: GlassPadding;
  radius?: keyof typeof radii;
  style?: ViewStyle;
  /** Overrides the translucent fill, e.g. for a selected/highlighted state. */
  tintColor?: string;
  /** Overrides the border color that accompanies tintColor. */
  tintBorderColor?: string;
  children: React.ReactNode;
}

const paddingMap: Record<GlassPadding, number> = {
  none: 0,
  sm: spacing.md,
  md: spacing.xl,
  lg: spacing["2xl"],
};

export function GlassCard({
  tint = "light",
  padding = "md",
  radius = "2xl",
  style,
  tintColor,
  tintBorderColor,
  children,
}: GlassCardProps) {
  const borderRadius = radii[radius];
  const defaultTint = tint === "light" ? colors.glassLight : colors.glassDark;
  const defaultBorder = tint === "light" ? colors.glassLightBorder : colors.glassDarkBorder;

  return (
    <View style={[{ borderRadius, overflow: "hidden" }, shadows.soft, style]}>
      <BlurView
        intensity={tint === "light" ? 40 : 30}
        tint={tint}
        style={[
          styles.blur,
          {
            borderRadius,
            padding: paddingMap[padding],
            backgroundColor: tintColor ?? defaultTint,
            borderColor: tintBorderColor ?? defaultBorder,
          },
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    borderWidth: 1,
  },
});
