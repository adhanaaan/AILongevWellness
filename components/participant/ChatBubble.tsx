import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

export interface ChatBubbleProps {
  role: "user" | "ava";
  children: string;
  disclaimer?: string;
}

export function ChatBubble({ role, children, disclaimer }: ChatBubbleProps) {
  const isUser = role === "user";

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(8)).current;
  const enterScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(enterTranslate, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(enterScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterTranslate, enterScale]);

  return (
    <View
      style={[
        styles.wrapper,
        { alignItems: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <Animated.View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.avaBubble,
          {
            opacity: enterOpacity,
            transform: [{ translateY: enterTranslate }, { scale: enterScale }],
          },
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.avaText]}>
          {children}
        </Text>
      </Animated.View>
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
