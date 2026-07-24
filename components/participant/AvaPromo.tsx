import React, { useEffect, useRef } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { FileText, Lock } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { Card } from "@/components/ui/Card";
import { ChatBubble } from "@/components/participant/ChatBubble";
import type { PipelineState } from "@/lib/types/db";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

export interface AvaPromoProps {
  pipelineState: PipelineState;
}

// AVA only ever appears once a card is signed, so the signed/delivered lines
// below are a defensive fallback for an unreachable case, kept only so the
// map stays exhaustive over PipelineState.
const STATUS_LINE: Record<PipelineState, string> = {
  capturing: "Your data capture isn't finished yet.",
  ai_drafted: "Your care team is reviewing your results now.",
  gp_review: "Your care team is reviewing your results now.",
  tcm_review: "Your care team is reviewing your results now.",
  signed: "Your report is signed off and on its way.",
  delivered: "Your report is signed off and on its way.",
};

export function AvaPromo({ pipelineState }: AvaPromoProps) {
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(enterTranslate, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterTranslate]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.page}>
        <GradientOrb tone="teal" size={220} style={styles.orbTop} />
        <GradientOrb tone="amber" size={180} style={styles.orbBottom} />

        <Animated.View
          style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}
        >
          <Card padding="lg" style={styles.mockCard}>
            <View style={styles.previewRow}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>PREVIEW</Text>
              </View>
            </View>

            <ChatBubble role="user">What does my vascular score mean?</ChatBubble>
            <ChatBubble role="ava">
              Your vascular score reflects markers from your labs, like blood
              pressure and cholesterol. I can walk you through what's driving
              yours once your card is ready.
            </ChatBubble>

            <View style={styles.sourceChip}>
              <FileText size={14} color={colors.inkMuted} />
              <Text style={styles.sourceChipText}>Example · lab results panel</Text>
            </View>

            <View style={styles.fakeInputRow}>
              <View style={styles.fakeInputPill}>
                <Text style={styles.fakeInputText}>Ask about your card...</Text>
              </View>
              <View style={styles.fakeSendButton}>
                <Lock size={16} color={colors.inkMuted} />
              </View>
            </View>
          </Card>

          <Text style={styles.overline}>ABOUT AVA</Text>
          <Text style={styles.headline}>Ask AVA about your own results.</Text>
          <Text style={styles.body}>
            AVA answers using only what's on your reviewed wellness card, and
            shows where each answer comes from. Questions outside that scope
            go back to your care team.
          </Text>

          <View style={styles.statusBlock}>
            <Text style={styles.statusLine}>{STATUS_LINE[pipelineState]}</Text>
            <Text style={styles.statusLine}>
              AVA will be ready once that review is signed off.
            </Text>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    marginTop: spacing.lg,
  },
  orbTop: {
    top: -60,
    right: -70,
  },
  orbBottom: {
    bottom: -60,
    left: -80,
  },
  mockCard: {
    marginBottom: spacing["3xl"],
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  previewBadge: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  previewBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1,
    color: colors.inkMuted,
  },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  sourceChipText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  fakeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    opacity: 0.65,
  },
  fakeInputPill: {
    flex: 1,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  fakeInputText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
  },
  fakeSendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  overline: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.2,
    color: colors.sageDark,
    marginBottom: spacing.sm,
  },
  headline: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    lineHeight: lineHeights.headlineLg,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    lineHeight: lineHeights.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  statusBlock: {
    marginTop: spacing["2xl"],
    gap: spacing.xs,
  },
  statusLine: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    lineHeight: lineHeights.labelMd,
    color: colors.inkMuted,
  },
});
