import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

type Tone = "sage" | "terracotta" | "danger" | "neutral";

interface SummaryStatCardProps {
  label: string;
  value: number | string;
  tone?: Tone;
  /** Optional small muted glyph shown beside the overline label. */
  icon?: React.ReactNode;
  /** Optional 0–100 proportion, rendered as a thin bar under the value. */
  progress?: number;
  /** Optional muted line under the value (e.g. "12 of 20 delivered"). */
  caption?: string;
}

const toneAccent: Record<Tone, string> = {
  sage: colors.teal,
  terracotta: colors.warning,
  danger: colors.danger,
  neutral: colors.borderStrong,
};

// Fresha-style console stat: a quiet uppercase overline, a clean number, and an
// optional thin proportion bar. No tinted icon circle, no colored fills — the
// number carries the card, tone only tints a hairline accent.
export function SummaryStatCard({
  label,
  value,
  tone = "neutral",
  icon,
  progress,
  caption,
}: SummaryStatCardProps) {
  const accent = toneAccent[tone];
  const clamped =
    typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <Text style={styles.value}>{value}</Text>

      {clamped !== null ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${clamped}%`, backgroundColor: accent },
            ]}
          />
        </View>
      ) : null}

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    ...shadows.card,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  icon: {
    opacity: 0.9,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    flex: 1,
  },
  value: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
  },
  track: {
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
