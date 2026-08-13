import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { ProgressRing } from "@/components/participant/ProgressRing";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing, teal } from "@/lib/theme/tokens";

export interface CarePlanTodayHeroProps {
  /** Actions completed today (medications taken + mood check-in). */
  done: number;
  /** Total actionable items today. */
  total: number;
  dateLabel: string;
}

function headline(done: number, total: number): { title: string; sub: string } {
  if (total <= 0) return { title: "Nothing due today", sub: "Your daily actions will appear here." };
  const remaining = total - done;
  if (remaining <= 0) return { title: "All caught up", sub: "You've completed today's check-ins. Nice work." };
  if (done === 0)
    return { title: "Let's begin", sub: `${total} quick action${total > 1 ? "s" : ""} to close out today.` };
  return {
    title: "Almost there",
    sub: `${remaining} check-in${remaining > 1 ? "s" : ""} left to finish today.`,
  };
}

// The Care Plan "Today" hero: a navy card (sibling to the Insights BodyMap hero)
// with a gradient progress ring showing how much of today's protocol is done, so
// the tab lands on something alive instead of a passive list.
export function CarePlanTodayHero({ done, total, dateLabel }: CarePlanTodayHeroProps) {
  const { title, sub } = headline(done, total);
  const fraction = total > 0 ? done / total : 0;

  return (
    <View style={styles.card}>
      <GradientOrb tone="teal" size={220} style={styles.orbTop} />
      <GradientOrb tone="amber" size={180} style={styles.orbBottom} />

      <View style={styles.row}>
        <ProgressRing
          fraction={fraction}
          size={104}
          stroke={9}
          from={teal[300]}
          to={teal[400]}
          trackColor="rgba(255,255,255,0.12)"
        >
          <Text style={styles.ringValue}>
            {done}
            <Text style={styles.ringValueTotal}>/{total}</Text>
          </Text>
          <Text style={styles.ringCaption}>TODAY</Text>
        </ProgressRing>

        <View style={styles.text}>
          <Text style={styles.eyebrow}>Today · {dateLabel}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.navy,
    borderRadius: radii["3xl"],
    padding: spacing["2xl"],
    overflow: "hidden",
    ...shadows.soft,
  },
  orbTop: { top: -70, right: -40 },
  orbBottom: { bottom: -70, left: -40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  ringValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 26,
    color: colors.inkOnDark,
    includeFontPadding: false,
    lineHeight: 30,
  },
  ringValueTotal: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 17,
    color: colors.inkOnDarkMuted,
  },
  ringCaption: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1,
    color: colors.inkOnDarkMuted,
    marginTop: 2,
  },
  text: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.inkOnDarkMuted,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    color: colors.inkOnDark,
    marginTop: 5,
  },
  sub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    marginTop: 6,
    lineHeight: 17,
  },
});
