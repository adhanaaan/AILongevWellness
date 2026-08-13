import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { MessageCircle, ChevronRight } from "lucide-react-native";
import { useAskAva } from "@/lib/ava/useAskAva";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface AskAvaButtonProps {
  /** The message sent to AVA on tap. */
  question: string;
  /** Row text, if different from the question itself. */
  label?: string;
}

// A tappable "ask AVA about this" row, woven onto the data screens so any score,
// marker, or plan item is one tap from a grounded answer. Matches the pillar
// page's original Ask-Ava row styling so the affordance reads the same everywhere.
export function AskAvaButton({ question, label }: AskAvaButtonProps) {
  const ask = useAskAva();
  return (
    <Pressable
      style={styles.row}
      onPress={() => ask(question)}
      accessibilityRole="button"
      accessibilityLabel={label ?? question}
    >
      <MessageCircle size={16} color={colors.sageDark} />
      <Text style={styles.text}>{label ?? question}</Text>
      <ChevronRight size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
});
