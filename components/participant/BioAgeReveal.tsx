import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react-native";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing, teal } from "@/lib/theme/tokens";

export interface RevealPillar {
  key: string;
  label: string;
  value: number;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface BioAgeRevealProps {
  bioAge: number;
  chronoAge: number;
  /** First name, for the personalized eyebrow. Optional. */
  name?: string;
  /** One-line plain-English read of the scores. */
  narrative?: string;
  pillars: RevealPillar[];
  /** Opens the "how this is calculated" drill-down. */
  onPressBio?: () => void;
}

const AGE_WINDOW = 15;

// Warm on the dark forest ground; sage = healthy, terracotta = focus area.
function pillarMeta(value: number): { color: string; tag: string } {
  if (value >= 75) return { color: teal[300], tag: "Strong" };
  if (value >= 60) return { color: colors.amberLight, tag: "Watch" };
  return { color: colors.terracotta, tag: "Focus" };
}

function Ring({ value }: { value: number }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const { color } = pillarMeta(value);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
        />
      </Svg>
      <View style={styles.ringValueWrap}>
        <Text style={styles.ringValue}>{value}</Text>
      </View>
    </View>
  );
}

export function BioAgeReveal({ bioAge, chronoAge, name, narrative, pillars, onPressBio }: BioAgeRevealProps) {
  const delta = chronoAge - bioAge;
  const younger = delta > 0;
  const deltaLabel =
    delta === 0
      ? `On pace with your ${chronoAge}`
      : `${Math.abs(delta)} year${Math.abs(delta) === 1 ? "" : "s"} ${younger ? "younger" : "older"} than your ${chronoAge}`;

  const min = chronoAge - AGE_WINDOW;
  const max = chronoAge + AGE_WINDOW;
  const markerPct = Math.max(5, Math.min(95, ((bioAge - min) / (max - min)) * 100));

  return (
    <View style={styles.card}>
      <GradientOrb tone="teal" size={320} style={styles.orbBack} />
      <GradientOrb tone="amber" size={200} style={styles.orbFront} />

      {onPressBio && (
        <Pressable style={styles.hint} onPress={onPressBio} accessibilityRole="button" accessibilityLabel="See how your biological age is calculated">
          <Text style={styles.hintText}>How this is calculated</Text>
          <ChevronRight size={13} color={colors.inkOnDarkMuted} />
        </Pressable>
      )}

      <Text style={styles.eyebrow}>
        {name ? `${name}, your biological age is` : "Your biological age"}
      </Text>

      <View style={styles.numberRow}>
        <Text style={styles.number}>{bioAge}</Text>
        <Text style={styles.unit}>years</Text>
      </View>

      <View style={[styles.delta, younger ? styles.deltaYounger : styles.deltaOlder]}>
        {delta !== 0 &&
          (younger ? (
            <ChevronUp size={14} color={colors.terracotta} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={14} color={colors.amberLight} strokeWidth={2.4} />
          ))}
        <Text style={[styles.deltaText, younger ? styles.deltaTextYounger : styles.deltaTextOlder]}>{deltaLabel}</Text>
      </View>

      {narrative ? <Text style={styles.narrative}>{narrative}</Text> : null}

      {/* Younger <-> older position bar */}
      <View style={styles.bar}>
        <View style={styles.track}>
          <View style={styles.centerTick} />
          <View style={[styles.marker, { left: `${markerPct}%`, backgroundColor: younger ? colors.terracotta : colors.amberLight }]} />
        </View>
        <View style={styles.barEnds}>
          <Text style={styles.barEnd}>Younger</Text>
          <Text style={styles.barAnchor}>Your age {chronoAge}</Text>
          <Text style={styles.barEnd}>Older</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.pillars}>
        {pillars.map((p) => {
          const meta = pillarMeta(p.value);
          return (
            <Pressable
              key={p.key}
              style={styles.pillar}
              onPress={p.onPress}
              accessibilityRole="button"
              accessibilityLabel={p.accessibilityLabel}
            >
              <Ring value={p.value} />
              <Text style={styles.pillarName}>{p.label}</Text>
              <Text style={[styles.pillarTag, { color: meta.color }]}>{meta.tag}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: teal[800],
    borderRadius: radii["3xl"],
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    ...shadows.soft,
  },
  orbBack: { top: -70, left: -60 },
  orbFront: { bottom: -60, right: -50, opacity: 0.5 },
  hint: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  hintText: { fontFamily: fontFamilies.body, fontSize: fontSizes.caption, color: colors.inkOnDarkMuted },
  eyebrow: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  numberRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  number: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 96,
    lineHeight: 100,
    letterSpacing: -1.5,
    color: colors.inkOnDark,
  },
  unit: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyLg,
    color: colors.inkOnDarkMuted,
    marginBottom: spacing.md,
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  deltaYounger: { backgroundColor: "rgba(233,138,109,0.14)", borderColor: "rgba(233,138,109,0.35)" },
  deltaOlder: { backgroundColor: "rgba(240,172,147,0.12)", borderColor: "rgba(240,172,147,0.3)" },
  deltaText: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.labelMd },
  deltaTextYounger: { color: colors.terracotta },
  deltaTextOlder: { color: colors.amberLight },
  narrative: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    lineHeight: 26,
    color: colors.inkOnDark,
    textAlign: "center",
    marginTop: spacing.xl,
    maxWidth: 320,
  },
  bar: {
    width: "100%",
    marginTop: spacing["2xl"],
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
  },
  centerTick: {
    position: "absolute",
    left: "50%",
    marginLeft: -1,
    top: -4,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  marker: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: -5,
    borderWidth: 2,
    borderColor: teal[800],
  },
  barEnds: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  barEnd: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.overline, color: colors.inkOnDarkMuted },
  barAnchor: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.caption, color: colors.inkOnDark },
  divider: {
    height: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: spacing["2xl"],
    marginBottom: spacing.xl,
  },
  pillars: { flexDirection: "row", justifyContent: "space-around", alignSelf: "stretch" },
  pillar: { alignItems: "center", gap: spacing.sm },
  ringValueWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  ringValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.inkOnDark,
  },
  pillarName: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.caption, color: colors.inkOnDarkMuted },
  pillarTag: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
