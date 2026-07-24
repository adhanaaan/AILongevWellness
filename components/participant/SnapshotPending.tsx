import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Check, FileCheck2, FilePen, FileSearch, Lock } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { Button } from "@/components/ui/Button";
import { CheckInCallout } from "@/components/participant/CheckInCallout";
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
  primaryLabel?: string;
  primaryRoute?: Href;
}

// Collapses the 5 pre-delivery pipeline states into 3 participant-facing
// steps. The AI draft happens automatically and isn't named separately, and
// GP vs TCM review isn't split out here either — both fold into "Review".
const STEP_FROM_STATE: Record<PipelineState, number> = {
  capturing: 0,
  ai_drafted: 1,
  gp_review: 1,
  tcm_review: 1,
  signed: 2,
  delivered: 2,
};

// A small file-lifecycle icon family (edit -> search -> check) that mirrors
// the real 3-step sequence, rather than decoration for its own sake.
const STEP_META: { label: string; Icon: typeof FilePen }[] = [
  { label: "Data capture", Icon: FilePen },
  { label: "Review", Icon: FileSearch },
  { label: "Get report", Icon: FileCheck2 },
];

const CONTENT: StageContent[] = [
  {
    headline: "Finish your data capture",
    body: "We still need some details before your care team can start reviewing.",
    primaryLabel: "Continue your data capture",
    primaryRoute: "/onboarding/capture",
  },
  {
    headline: "Your care team is reviewing your results",
    body: "A GP and a TCM practitioner are going through your intake and biomarkers together.",
    detail: "Usually takes 1 to 2 business days. We'll let you know the moment it's done.",
  },
  {
    headline: "Your report is almost ready",
    body: "Both reviews are done. We're putting together your wellness card now.",
    detail: "You'll get a notification as soon as it's ready.",
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
  const calloutOpacity = useRef(new Animated.Value(0)).current;
  const calloutTranslate = useRef(new Animated.Value(12)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Entrance: main content fades + rises first, the check-in callout follows
  // ~100ms behind so it reads as a secondary, noticed-a-beat-later element.
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
      Animated.timing(calloutOpacity, {
        toValue: 1,
        duration: 350,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(calloutTranslate, {
        toValue: 0,
        duration: 350,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterTranslate, calloutOpacity, calloutTranslate]);

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
    <View style={styles.page}>
      <GradientOrb tone="teal" size={220} style={styles.orbTop} />
      <GradientOrb tone="amber" size={200} style={styles.orbBottom} />

      <Animated.View
        style={{ opacity: enterOpacity, transform: [{ translateY: enterTranslate }] }}
      >
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
                      <Check size={18} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : isActive ? (
                    <Animated.View
                      style={[styles.circle, styles.circleActive, { opacity: pulse }]}
                    >
                      <StepIcon size={18} color={colors.sageDark} />
                    </Animated.View>
                  ) : (
                    <View style={[styles.circle, styles.circleLocked]}>
                      <Lock size={15} color={colors.inkMuted} />
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

        {content.primaryLabel && content.primaryRoute && (
          <Button size="lg" style={styles.primaryButton} onPress={() => router.push(content.primaryRoute!)}>
            {content.primaryLabel}
          </Button>
        )}
      </Animated.View>

      <Animated.View
        style={{
          opacity: calloutOpacity,
          transform: [{ translateY: calloutTranslate }],
          marginTop: spacing["2xl"],
        }}
      >
        <CheckInCallout />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    marginTop: spacing.lg,
  },
  orbTop: {
    top: -60,
    right: -70,
  },
  orbBottom: {
    bottom: 60,
    left: -90,
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
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing["3xl"],
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  circle: {
    width: 40,
    height: 40,
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
    marginTop: spacing.sm,
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
    marginTop: 19,
    marginHorizontal: spacing.xs,
  },
  progressTrack: {
    height: 8,
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
  primaryButton: {
    marginTop: spacing["2xl"],
  },
});
