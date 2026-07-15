import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface ChatBubbleProps {
  role: "user" | "ava";
  children: string;
  disclaimer?: string;
}

export function ChatBubble({ role, children, disclaimer }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <View
      style={[
        styles.wrapper,
        { alignItems: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.avaBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.avaText]}>
          {children}
        </Text>
      </View>
      {disclaimer && (
        <Text style={styles.disclaimer}>{disclaimer}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  userBubble: {
    backgroundColor: colors.sageTint,
    alignSelf: "flex-end",
    borderBottomRightRadius: radii.sm,
  },
  avaBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
    borderBottomLeftRadius: radii.sm,
  },
  text: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.regular,
  },
  userText: {
    color: colors.charcoal,
  },
  avaText: {
    color: colors.charcoal,
  },
  disclaimer: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
});
