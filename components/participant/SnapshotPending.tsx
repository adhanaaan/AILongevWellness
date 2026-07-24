import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Check, Clock, Leaf, Lock, ShieldCheck, Stethoscope } from "lucide-react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import type { PipelineState } from "@/lib/types/db";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

interface SnapshotPendingProps {
  pipelineState: PipelineState;
}

interface StageContent {
  headline: string;
  body: string;
  detail?: string;
  primaryLabel: string;
  primaryRoute: Href;
  secondaryLabel?: string;
  secondaryRoute?: Href;
}

// Collapses the 5 pre-delivery pipeline states into 4 participant-facing
// steps — the AI draft happens automatically and is invisible to the
// participant, so it folds into the "GP review" step it feeds into.
const STEP_FROM_STATE: Record<PipelineState, number> = {
  capturing: 0,
  ai_drafted: 1,
  gp_review: 1,
  tcm_review: 2,
  signed: 3,
  delivered: 3,
};

const STEP_META: { label: string; Icon: typeof Clock }[] = [
  { label: "Intake", Icon: Clock },
  { label: "GP review", Icon: Stethoscope },
  { label: "TCM review", Icon: Leaf },
  { label: "Finalizing", Icon: ShieldCheck },
];

const REVIEW_DETAIL =
  "Typically takes 1–2 business days. We'll notify you the moment there's an update — no need to check back.";

const CONTENT: StageContent[] = [
  {
    headline: "Let's finish your intake",
    body: "A few details are still needed before your care team can begin their review.",
    primaryLabel: "Continue your intake",
    primaryRoute: "/onboarding/capture",
  },
  {
    headline: "Your GP is reviewing your results",
    body: "Your intake and biomarkers are with your GP for a full wellness review.",
    detail: REVIEW_DETAIL,
    primaryLabel: "Ask AVA a wellness question",
    primaryRoute: "/(tabs)/ava",
    secondaryLabel: "Log today's check-in",
    secondaryRoute: "/(tabs)/tracking",
  },
  {
    headline: "Your TCM practitioner is reviewing your results",
    body: "Your GP's review is complete. A Traditional Chinese Medicine practitioner is now adding their perspective.",
    detail: REVIEW_DETAIL,
    primaryLabel: "Ask AVA a wellness question",
    primaryRoute: "/(tabs)/ava",
    secondaryLabel: "Log today's check-in",
    secondaryRoute: "/(tabs)/tracking",
  },
  {
    headline: "Your snapshot is being finalized",
    body: "Both reviews are complete. Your care team is finalizing your wellness card for delivery.",
    detail: "Almost ready — we'll notify you the second it's in your hands.",
    primaryLabel: "Ask AVA a wellness question",
    primaryRoute: "/(tabs)/ava",
    secondaryLabel: "Log today's check-in",
    secondaryRoute: "/(tabs)/tracking",
  },
];

const TOTAL_STEPS = STEP_META.length;

export function SnapshotPending({ pipelineState }: SnapshotPendingProps) {
  const router = useRouter();
  const stepIndex = STEP_FROM_STATE[pipelineState];
  const [displayedStep, setDisplayedStep] = useState(stepIndex);
  const content = CONTENT[displayedStep];
  const hasMounted = useRef(false);

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Entrance: fade + rise on mount.
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

  // Gentle breathing pulse on the active step, unless the OS asks for less motion.
  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled || reduceMotion) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 0.55,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        loop.start();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [pulse]);

  // Progress bar always tracks the real step immediately. Headline/body/detail
  // cross-fade so the copy swap doesn't feel like an abrupt jump cut.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: ((stepIndex + 1) / TOTAL_STEPS) * 100,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (stepIndex === displayedStep) return;

    Animated.timing(textOpacity, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setDisplayedStep(stepIndex);
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    // Only the real step index should retrigger this transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  return (
    <Animated.View
      style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}
    >
      <GlassCard tint="light" padding="lg" style={styles.card}>
        <Text style={styles.overline}>YOUR WELLNESS SNAPSHOT</Text>

        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.headline}>{content.headline}</Text>
          <Text style={styles.body}>{content.body}</Text>
        </Animated.View>

        <View style={styles.stepper}>
          {STEP_META.map((step, index) => {
            const isDone = index < stepIndex;
            const isActive = index === stepIndex;
            const isLast = index === STEP_META.length - 1;
            const StepIcon = step.Icon;

            return (
              <React.Fragment key={step.label}>
                <View style={styles.stepItem}>
                  {isDone ? (
                    <View style={[styles.circle, styles.circleDone]}>
                      <Check size={16} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : isActive ? (
                    <Animated.View
                      style={[styles.circle, styles.circleActive, { opacity: pulse }]}
                    >
                      <StepIcon size={16} color={colors.sageDark} />
                    </Animated.View>
                  ) : (
                    <View style={[styles.circle, styles.circleLocked]}>
                      <Lock size={13} color={colors.inkMuted} />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.stepLabel,
                      isDone && styles.stepLabelDone,
                      isActive && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: isDone ? colors.sage : colors.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {content.detail && (
          <Animated.Text style={[styles.detail, { opacity: textOpacity }]}>
            {content.detail}
          </Animated.Text>
        )}

        <View style={styles.actions}>
          <Button size="lg" onPress={() => router.push(content.primaryRoute)}>
            {content.primaryLabel}
          </Button>
          {content.secondaryLabel && content.secondaryRoute && (
            <Button variant="ghost" size="md" onPress={() => router.push(content.secondaryRoute!)}>
              {content.secondaryLabel}
            </Button>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing["2xl"],
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
    fontSize: fontSizes.headlineMd,
    lineHeight: lineHeights.headlineMd,
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
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing["2xl"],
  },
  stepItem: {
    alignItems: "center",
    width: 72,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    backgroundColor: colors.sage,
  },
  circleActive: {
    backgroundColor: colors.sageTint,
    borderWidth: 2,
    borderColor: colors.sage,
  },
  circleLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  stepLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  stepLabelDone: {
    color: colors.sageDark,
  },
  stepLabelActive: {
    color: colors.ink,
    fontFamily: fontFamilies.bodySemiBold,
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginTop: 15,
    marginHorizontal: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: spacing.lg,
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.sage,
  },
  detail: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    lineHeight: lineHeights.labelMd,
    color: colors.inkMuted,
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },
});
