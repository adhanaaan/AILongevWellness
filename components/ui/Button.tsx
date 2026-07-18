import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  View,
} from "react-native";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "full" | "md";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  children: string;
}

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    text: { fontSize: fontSizes.labelMd },
  },
  md: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    text: { fontSize: fontSizes.bodyMd },
  },
  lg: {
    container: { paddingVertical: spacing.lg, paddingHorizontal: spacing["2xl"] },
    text: { fontSize: fontSizes.bodyLg },
  },
};

export function Button({
  variant = "primary",
  size = "md",
  shape = "md",
  iconLeft,
  iconRight,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const borderRadius = shape === "full" ? radii.full : radii.lg;

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size].container,
    { borderRadius },
    variant === "primary" && styles.primaryContainer,
    variant === "secondary" && styles.secondaryContainer,
    variant === "ghost" && styles.ghostContainer,
    disabled && styles.disabled,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.baseText,
    sizeStyles[size].text,
    variant === "primary" && styles.primaryText,
    variant === "secondary" && styles.secondaryText,
    variant === "ghost" && styles.ghostText,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {iconLeft && <View style={styles.iconLeft}>{iconLeft}</View>}
      <Text style={textStyle}>{children}</Text>
      {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryContainer: {
    backgroundColor: colors.teal,
  },
  secondaryContainer: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostContainer: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontFamily: fontFamilies.bodySemiBold,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.teal,
  },
  ghostText: {
    color: colors.teal,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
