import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Sparkles, Watch, HeartPulse, ShieldCheck } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { Button } from "@/components/ui/Button";
import { CalmConfirmation } from "@/components/onboarding/CalmConfirmation";
import { colors, spacing } from "@/lib/theme/tokens";

const SLIDES = [
  {
    icon: Sparkles,
    title: "Your Executive Health Intelligence",
    subtitle: "One place for your labs, wearables, and body composition data.",
  },
  {
    icon: Watch,
    title: "Connected From Every Angle",
    subtitle: "Wearables, lab reports, and body composition scans all roll into one wellness snapshot.",
  },
  {
    icon: HeartPulse,
    title: "Reviewed By Your Care Team",
    subtitle: "A GP and TCM practitioner review your data before you see your card.",
  },
  {
    icon: ShieldCheck,
    title: "Wellness, Not Diagnosis",
    subtitle: "This is general wellness information, never medical advice.",
  },
];

export default function OnboardingIntroPage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setSlideWidth(e.nativeEvent.layout.width);
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    // Covers manual swipes (the button path sets activeIndex directly, see onNext).
    if (!slideWidth) return;
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
  }

  function goToAuth() {
    router.push("/onboarding/auth");
  }

  function onNext() {
    if (activeIndex === SLIDES.length - 1) {
      goToAuth();
      return;
    }
    // Set the index directly rather than waiting for onMomentumScrollEnd —
    // that event doesn't reliably fire after a programmatic scrollTo on web,
    // which would otherwise leave the button stuck on "Next" past slide 2.
    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: slideWidth * nextIndex, animated: true });
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={260} style={styles.orbBottomRight} />

      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={goToAuth}>
          Skip
        </Button>
      </View>

      <View style={styles.slidesWrap} onLayout={onLayout}>
        {slideWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
          >
            {SLIDES.map((slide) => {
              const Icon = slide.icon;
              return (
                <View key={slide.title} style={[styles.slide, { width: slideWidth }]}>
                  <CalmConfirmation
                    align="center"
                    icon={<Icon size={28} color={colors.teal} />}
                    title={slide.title}
                    subtitle={slide.subtitle}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dotRow}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.title}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <Button size="lg" onPress={onNext}>
          {isLast ? "Get started" : "Next"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
    overflow: "hidden",
  },
  orbTopLeft: { top: -80, left: -100, opacity: 0.5 },
  orbBottomRight: { bottom: -60, right: -100, opacity: 0.4 },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  slidesWrap: { flex: 1 },
  slide: {
    paddingHorizontal: spacing["2xl"],
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: { width: 20, backgroundColor: colors.teal },
  dotInactive: { width: 6, backgroundColor: colors.border },
});
