import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export interface CalmConfirmationProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** "left" matches every existing onboarding screen; "center" is for the Intro carousel. */
  align?: "left" | "center";
  style?: ViewStyle;
}

/**
 * The icon-in-circle + headline + muted subtitle block used across the
 * onboarding flow's intro/explainer/confirmation screens (previously
 * duplicated verbatim per-screen).
 */
export function CalmConfirmation({ icon, title, subtitle, align = "left", style }: CalmConfirmationProps) {
  const centered = align === "center";
  return (
    <View style={[centered && styles.center, style]}>
      <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
        {icon}
      </GlassCard>
      <Text style={[styles.title, centered && styles.textCenter]}>{title}</Text>
      <Text style={[styles.subtitle, centered && styles.textCenter]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  textCenter: { textAlign: "center" },
});
