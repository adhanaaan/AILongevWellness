import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

/* ---------- shared label / error wrapper ---------- */

interface FieldWrapperProps {
  label?: string;
  error?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, style, children }: FieldWrapperProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/* ---------- Input ---------- */

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} style={containerStyle}>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholderTextColor={colors.inkMuted}
        {...rest}
      />
    </FieldWrapper>
  );
}

/* ---------- Textarea ---------- */

export interface TextareaProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Textarea({
  label,
  error,
  containerStyle,
  ...rest
}: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} style={containerStyle}>
      <TextInput
        style={[styles.input, styles.textarea, error ? styles.inputError : undefined]}
        placeholderTextColor={colors.inkMuted}
        multiline
        textAlignVertical="top"
        {...rest}
      />
    </FieldWrapper>
  );
}

/* ---------- Select (TextInput-based placeholder) ---------- */

export interface SelectProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Select({
  label,
  error,
  containerStyle,
  ...rest
}: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} style={containerStyle}>
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined]}
        placeholderTextColor={colors.inkMuted}
        {...rest}
      />
    </FieldWrapper>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.medium,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  textarea: {
    minHeight: 100,
  },
  error: {
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
});
