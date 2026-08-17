import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
  Ellipse,
  Circle,
  G,
  Text as SvgText,
} from "react-native-svg";
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

// ─── Anatomical body (Mental/head, Vascular/heart, Metabolic/core) ───
// The pliability reference: a body silhouette on a dark ground with each system's
// score living on its region. Node color follows health status (sage/amber/
// terracotta), so the body reads as "how am I doing" at a glance.
type BodyKey = "vascular" | "metabolic" | "mental";
const CX = 160;
const BODY_LAYOUT: Record<BodyKey, { cy: number; r: number; glowR: number; labelY: number; label: string; fs: number }> = {
  mental: { cy: 60, r: 30, glowR: 50, labelY: 104, label: "MENTAL", fs: 23 },
  vascular: { cy: 188, r: 34, glowR: 60, labelY: 238, label: "VASCULAR", fs: 27 },
  metabolic: { cy: 276, r: 29, glowR: 54, labelY: 318, label: "METABOLIC", fs: 22 },
};
const BUST_PATH =
  "M104,120 C74,130 58,158 64,210 C67,252 80,322 99,392 L221,392 C240,322 253,252 256,210 C262,158 246,130 216,120 C200,112 188,110 160,110 C132,110 120,112 104,120 Z";
const NECK_PATH = "M149,96 L171,96 L170,117 L150,117 Z";

function BodyFigure({ pillars }: { pillars: RevealPillar[] }) {
  // useId() strings contain colons which break react-native-svg url(#id) refs.
  const uid = React.useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const byKey = (k: BodyKey) => pillars.find((p) => p.key === k);
  const order: BodyKey[] = ["mental", "vascular", "metabolic"];

  return (
    <View style={styles.svgWrap}>
      <Svg width="100%" height="100%" viewBox="0 0 320 400" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <RadialGradient id={id("vol")} gradientUnits="userSpaceOnUse" cx="160" cy="176" r="180">
            <Stop offset="0" stopColor="#DCEBDE" stopOpacity="0.30" />
            <Stop offset="0.42" stopColor="#B7D3B8" stopOpacity="0.13" />
            <Stop offset="1" stopColor="#B7D3B8" stopOpacity="0.02" />
          </RadialGradient>
          <LinearGradient id={id("glass")} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1d3327" />
            <Stop offset="1" stopColor="#0c1810" />
          </LinearGradient>
          {order.map((k) => {
            const p = byKey(k);
            const glow = p ? pillarMeta(p.value).color : teal[300];
            return (
              <RadialGradient key={k} id={id(`glow-${k}`)} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={glow} stopOpacity="0.55" />
                <Stop offset="1" stopColor={glow} stopOpacity="0" />
              </RadialGradient>
            );
          })}
        </Defs>

        {/* volumetric ghosted form */}
        <G fill={`url(#${id("vol")})`} stroke="rgba(255,255,255,0.12)" strokeWidth={1}>
          <Path d={BUST_PATH} />
          <Path d={NECK_PATH} />
          <Ellipse cx="160" cy="60" rx="33" ry="39" />
        </G>
        <Ellipse cx="150" cy="150" rx="34" ry="60" fill="#ffffff" opacity={0.04} />

        {/* region glows */}
        {order.map((k) => {
          const p = byKey(k);
          if (!p) return null;
          const L = BODY_LAYOUT[k];
          return <Circle key={`glow-${k}`} cx={CX} cy={L.cy} r={L.glowR} fill={`url(#${id(`glow-${k}`)})`} />;
        })}

        {/* nodes */}
        {order.map((k) => {
          const p = byKey(k);
          if (!p) return null;
          const L = BODY_LAYOUT[k];
          const { color } = pillarMeta(p.value);
          return (
            <G key={`node-${k}`} onPress={p.onPress} accessibilityLabel={p.accessibilityLabel}>
              <Circle cx={CX} cy={L.cy} r={L.r} fill={`url(#${id("glass")})`} stroke={color} strokeWidth={2.5} />
              <SvgText x={CX} y={L.cy + L.fs * 0.34} fill={colors.inkOnDark} fontSize={L.fs} fontWeight="800" textAnchor="middle">
                {p.value}
              </SvgText>
              <SvgText x={CX} y={L.labelY} fill={color} fontSize={10} fontWeight="700" textAnchor="middle">
                {L.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
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

      {/* The body: three systems carrying their scores */}
      <BodyFigure pillars={pillars} />

      {/* Status legend — pillar name + Strong/Watch/Focus, tappable */}
      <View style={styles.legend}>
        {pillars.map((p) => {
          const meta = pillarMeta(p.value);
          return (
            <Pressable
              key={p.key}
              style={styles.legendItem}
              onPress={p.onPress}
              accessibilityRole="button"
              accessibilityLabel={p.accessibilityLabel}
            >
              <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
              <Text style={styles.legendName}>{p.label}</Text>
              <Text style={[styles.legendTag, { color: meta.color }]}>{meta.tag}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.foot}>Tap a system to see what&apos;s driving it.</Text>
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
    marginBottom: spacing.md,
  },
  svgWrap: { width: "100%", height: 380 },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignSelf: "stretch",
    marginTop: spacing.xs,
  },
  legendItem: { alignItems: "center", gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.caption, color: colors.inkOnDarkMuted },
  legendTag: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  foot: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    marginTop: spacing.lg,
  },
});
