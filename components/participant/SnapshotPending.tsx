import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Check, FileCheck2, FilePen, FileSearch, Lock } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { Button } from "@/components/ui/Button";
import { CheckInCallout } from "@/components/participant/CheckInCallout";
import { BiologicalAgeHero } from "@/components/participant/BiologicalAgeHero";
import { PillarRangeList } from "@/components/participant/PillarRangeList";
import { pillarStatus } from "@/lib/ai/scoring";
import type { PillarScores, PipelineState } from "@/lib/types/db";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "@/lib/theme/tokens";

export interface SnapshotPreview {
  scores: PillarScores;
  biologicalAge: number;
  chronologicalAge: number;
}

interface SnapshotPendingProps {
  pipelineState: PipelineState;
  /** The AI draft's raw scores/bio age, shown before care-team review — undefined
   * once nothing has been generated yet (still capturing). Deliberately excludes
   * the narrative, key contributors, and discussion points, since those are the
   * more interpretive parts a human review exists to catch if the AI got wrong. */
  preview?: SnapshotPreview;
}

// Non-interactive here on purpose -- this is a preliminary, unreviewed look,
// not the full drill-down the delivered card offers once a human has signed
// off on it.
function PreliminaryPreview({ preview }: { preview: SnapshotPreview }) {
  const pillarItems = (Object.keys(preview.scores) as Array<keyof PillarScores>).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: preview.scores[key],
    status: pillarStatus(preview.scores[key]),
  }));

  return (
    <View style={styles.previewWrap}>
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>PRELIMINARY · PENDING CARE TEAM REVIEW</Text>
      </View>
      <BiologicalAgeHero bioAge={preview.biologicalAge} chronoAge={preview.chronologicalAge} />
      <View style={styles.previewPillars}>
        <PillarRangeList items={pillarItems} />
      </View>
      <Text style={styles.previewNote}>
        These are the AI&apos;s first-pass numbers. Your care team may adjust them before your
        full report is ready.
      </Text>
    </View>
  );
}

// A "ghost" version of the real snapshot shown while the participant still has
// no data: the biological-age hero and the three pillar rings rendered EMPTY
// (with "—"), so the missing numbers themselves become the pull to upload —
// instead of a bare CTA with nothing to fill in. Mirrors the real
// BiologicalAgeHero / ScoreRing layout so it reads as "this is what you'll get".
const BLANK_PILLARS = ["Vascular", "Metabolic", "Mental"];

function BlankRing({ label }: { label: string }) {
  return (
    <View style={styles.blankRingItem}>
      <View style={styles.blankRing}>
        <Text style={styles.blankRingValue}>—</Text>
      </View>
      <Text style={styles.blankRingLabel}>{label}</Text>
    </View>
  );
}

function BlankSnapshotPreview() {
  return (
    <View style={styles.blankWrap}>
      <View style={styles.blankHero}>
        <GradientOrb tone="teal" size={280} style={styles.blankOrbBack} />
        <GradientOrb tone="amber" size={200} style={styles.blankOrbFront} />
        <Text style={styles.blankHeroLabel}>Biological age</Text>
        <Text style={styles.blankHeroValue}>—</Text>
        <View style={styles.blankPill}>
          <Lock size={12} color={colors.inkOnDarkMuted} />
          <Text style={styles.blankPillText}>Upload a lab report to reveal</Text>
        </View>
        <Text style={styles.blankHeroExplain}>
          Your vascular, metabolic and mental markers come from your labs. Add a recent report and
          these fill in.
        </Text>
      </View>

      <Text style={styles.blankSectionLabel}>YOUR PILLAR SCORES</Text>
      <View style={styles.blankRingRow}>
        {BLANK_PILLARS.map((label) => (
          <BlankRing key={label} label={label} />
        ))}
      </View>
    </View>
  );
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
    headline: "Let's build your snapshot",
    body: "Add your data and your biological age and pillar scores start filling in — the more you share, the sharper it gets.",
    primaryLabel: "Add your data",
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

export function SnapshotPending({ pipelineState, preview }: SnapshotPendingProps) {
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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

        {preview && <PreliminaryPreview preview={preview} />}

        {/* No data yet (still capturing): show the empty scores so the blanks
            pull the participant to upload, rather than just a CTA button. */}
        {!preview && stepIndex === 0 && <BlankSnapshotPreview />}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing["3xl"],
  },
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
  previewWrap: {
    marginTop: spacing["3xl"],
  },
  previewBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.terracottaTint,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  previewBadgeText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.6,
    color: colors.terracottaInk,
  },
  previewPillars: {
    marginTop: spacing.xl,
  },
  previewNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: lineHeights.caption,
  },
  blankWrap: {
    marginTop: spacing["3xl"],
  },
  blankHero: {
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: colors.navy,
    borderRadius: radii["3xl"],
    padding: spacing["2xl"],
    // Lower opacity than the delivered hero so it reads as a placeholder, not a result.
    opacity: 0.92,
  },
  blankOrbBack: {
    bottom: -80,
    right: -80,
  },
  blankOrbFront: {
    top: -20,
    left: "50%",
    marginLeft: -100,
  },
  blankHeroLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkOnDarkMuted,
    marginBottom: spacing.sm,
  },
  blankHeroValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.display,
    color: "rgba(255,255,255,0.55)",
    lineHeight: fontSizes.display * 1.05,
  },
  blankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  blankPillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkOnDark,
  },
  blankHeroExplain: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
  },
  blankSectionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.2,
    color: colors.sageDark,
    marginTop: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  blankRingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blankRingItem: {
    alignItems: "center",
    flex: 1,
  },
  blankRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 9,
    borderColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  blankRingValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 30,
    color: colors.borderStrong,
    includeFontPadding: false,
  },
  blankRingLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
