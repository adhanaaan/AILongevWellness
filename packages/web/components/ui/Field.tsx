import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

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
  const [visible, setVisible] = useState(false);
  // Any secure field gets a show/hide toggle so users can verify what they
  // typed (testers couldn't confirm their password had no typos).
  const isSecure = Boolean(rest.secureTextEntry);

  if (isSecure) {
    return (
      <FieldWrapper label={label} error={error} style={containerStyle}>
        <View>
          <TextInput
            style={[styles.input, styles.inputWithAdornment, error ? styles.inputError : undefined]}
            placeholderTextColor={colors.inkMuted}
            {...rest}
            secureTextEntry={!visible}
          />
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            style={styles.adornment}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
          >
            {visible ? (
              <EyeOff size={18} color={colors.inkMuted} />
            ) : (
              <Eye size={18} color={colors.inkMuted} />
            )}
          </TouchableOpacity>
        </View>
      </FieldWrapper>
    );
  }

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
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: fontFamilies.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputWithAdornment: {
    paddingRight: spacing["3xl"],
  },
  adornment: {
    position: "absolute",
    right: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  inputError: {
    borderColor: colors.danger,
  },
  textarea: {
    minHeight: 100,
  },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.danger,
  },
});
