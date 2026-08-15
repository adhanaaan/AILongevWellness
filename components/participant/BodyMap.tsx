import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
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
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

export type BodyPillarKey = "vascular" | "metabolic" | "mental";

export interface BodyMapPillar {
  key: BodyPillarKey;
  /** null renders the region as locked (no data captured for it yet). */
  value: number | null;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export interface BodyMapProps {
  /** null when there isn't enough data across the pillars to state a biological age honestly. */
  bioAge: number | null;
  chronoAge: number;
  pillars: BodyMapPillar[];
  /** Tapping the biological-age caption (e.g. to open the bio-age explainer). */
  onPressBio?: () => void;
}

const CX = 160;
const LAYOUT: Record<
  BodyPillarKey,
  { cy: number; r: number; glowR: number; labelY: number; ring: string; glow: string; label: string; fs: number }
> = {
  mental: { cy: 60, r: 30, glowR: 50, labelY: 104, ring: colors.mentalLight, glow: colors.mental, label: "MENTAL", fs: 23 },
  vascular: { cy: 188, r: 34, glowR: 60, labelY: 238, ring: colors.vascularLight, glow: colors.vascular, label: "VASCULAR", fs: 27 },
  metabolic: { cy: 276, r: 29, glowR: 54, labelY: 318, ring: colors.metabolicLight, glow: colors.metabolic, label: "METABOLIC", fs: 22 },
};

const BUST_PATH =
  "M104,120 C74,130 58,158 64,210 C67,252 80,322 99,392 L221,392 C240,322 253,252 256,210 C262,158 246,130 216,120 C200,112 188,110 160,110 C132,110 120,112 104,120 Z";
const NECK_PATH = "M149,96 L171,96 L170,117 L150,117 Z";

// A stylized, volumetric body silhouette (react-native-svg) with each pillar
// mapped onto its region -- Mental/head, Vascular/heart, Metabolic/core. Regions
// render "locked" (dashed, no score) until that pillar has captured data, then
// light up with their score, so the hero fills in as the participant captures.
export function BodyMap({ bioAge, chronoAge, pillars, onPressBio }: BodyMapProps) {
  // react-native-svg resolves url(#id) references; useId() strings contain
  // colons which break those refs, so strip them for a safe, collision-free id.
  const uid = React.useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;

  const delta = bioAge === null ? 0 : chronoAge - bioAge;
  const deltaLabel =
    delta > 0 ? `${delta} years younger` : delta < 0 ? `${Math.abs(delta)} years older` : "on pace with your age";

  const byKey = (k: BodyPillarKey) => pillars.find((p) => p.key === k);

  return (
    <View style={styles.card}>
      <GradientOrb tone="amber" size={280} style={styles.ambTop} />
      <GradientOrb tone="teal" size={240} style={styles.ambBottom} />

      <Pressable
        onPress={onPressBio}
        disabled={!onPressBio}
        accessibilityRole={onPressBio ? "button" : undefined}
        accessibilityLabel={onPressBio ? "See how your biological age is calculated" : undefined}
        style={styles.bioCaption}
      >
        <Text style={styles.eyebrow}>Biological age</Text>
        {bioAge === null ? (
          <Text style={styles.ageLocked}>Unlocks once we have data across all three systems</Text>
        ) : (
          <View style={styles.ageRow}>
            <Text style={styles.age}>{bioAge}</Text>
            <Text style={styles.ageDelta}> · {deltaLabel}</Text>
          </View>
        )}
        {onPressBio && bioAge !== null && (
          <View style={styles.exploreHint}>
            <Text style={styles.exploreHintText}>See how this is calculated</Text>
            <ChevronRight size={13} color={colors.inkOnDarkMuted} />
          </View>
        )}
      </Pressable>

      <View style={styles.svgWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 320 400" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <RadialGradient id={id("vol")} gradientUnits="userSpaceOnUse" cx="160" cy="176" r="180">
              <Stop offset="0" stopColor="#DCE6FF" stopOpacity="0.36" />
              <Stop offset="0.42" stopColor="#C3D2FF" stopOpacity="0.17" />
              <Stop offset="1" stopColor="#C3D2FF" stopOpacity="0.02" />
            </RadialGradient>
            <LinearGradient id={id("glass")} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#22355a" />
              <Stop offset="1" stopColor="#0b1830" />
            </LinearGradient>
            {(Object.keys(LAYOUT) as BodyPillarKey[]).map((k) => (
              <RadialGradient key={k} id={id(`glow-${k}`)} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={LAYOUT[k].glow} stopOpacity="0.6" />
                <Stop offset="1" stopColor={LAYOUT[k].glow} stopOpacity="0" />
              </RadialGradient>
            ))}
          </Defs>

          {/* volumetric ghosted form */}
          <G fill={`url(#${id("vol")})`} stroke="rgba(255,255,255,0.14)" strokeWidth={1}>
            <Path d={BUST_PATH} />
            <Path d={NECK_PATH} />
            <Ellipse cx="160" cy="60" rx="33" ry="39" />
          </G>
          <Ellipse cx="150" cy="150" rx="34" ry="60" fill="#ffffff" opacity={0.05} />

          {/* region glows (active pillars only) */}
          {(Object.keys(LAYOUT) as BodyPillarKey[]).map((k) => {
            const p = byKey(k);
            if (!p || p.value === null) return null;
            const L = LAYOUT[k];
            return <Circle key={`glow-${k}`} cx={CX} cy={L.cy} r={L.glowR} fill={`url(#${id(`glow-${k}`)})`} />;
          })}

          {/* nodes */}
          {(Object.keys(LAYOUT) as BodyPillarKey[]).map((k) => {
            const p = byKey(k);
            if (!p) return null;
            const L = LAYOUT[k];
            const locked = p.value === null;
            return (
              <G key={`node-${k}`} onPress={p.onPress} accessibilityLabel={p.accessibilityLabel}>
                {locked ? (
                  <>
                    <Circle
                      cx={CX}
                      cy={L.cy}
                      r={L.r}
                      fill={colors.navy}
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={2}
                      strokeDasharray="4 5"
                    />
                    <SvgText x={CX} y={L.cy + 7} fill="rgba(255,255,255,0.35)" fontSize={20} fontWeight="700" textAnchor="middle">
                      –
                    </SvgText>
                    <SvgText x={CX} y={L.labelY} fill="rgba(255,255,255,0.3)" fontSize={10} fontWeight="700" textAnchor="middle">
                      {L.label}
                    </SvgText>
                  </>
                ) : (
                  <>
                    <Circle cx={CX} cy={L.cy} r={L.r} fill={`url(#${id("glass")})`} stroke={L.ring} strokeWidth={2.5} />
                    <SvgText x={CX} y={L.cy + L.fs * 0.34} fill={colors.inkOnDark} fontSize={L.fs} fontWeight="800" textAnchor="middle">
                      {p.value}
                    </SvgText>
                    <SvgText x={CX} y={L.labelY} fill={L.ring} fontSize={10} fontWeight="700" textAnchor="middle">
                      {L.label}
                    </SvgText>
                  </>
                )}
              </G>
            );
          })}
        </Svg>
      </View>

      <Text style={styles.foot}>Three systems, one you</Text>
      <Text style={styles.footSub}>Tap a system to see what&apos;s driving it.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: colors.navy,
    borderRadius: radii["3xl"],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    ...shadows.soft,
  },
  ambTop: { top: -70, left: "50%", marginLeft: -140 },
  ambBottom: { bottom: -70, left: -80 },
  bioCaption: { alignItems: "center", position: "relative", width: "100%" },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.inkOnDarkMuted,
  },
  ageRow: { flexDirection: "row", alignItems: "baseline", marginTop: 2 },
  age: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.inkOnDark,
  },
  ageDelta: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkOnDarkMuted,
  },
  ageLocked: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.inkOnDarkMuted,
    textAlign: "center",
    marginTop: 2,
    maxWidth: 260,
  },
  exploreHint: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  exploreHintText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
  },
  svgWrap: { width: "100%", height: 380, marginTop: spacing.xs },
  foot: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    fontWeight: "700",
    color: colors.inkOnDark,
    marginTop: spacing.xs,
  },
  footSub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkOnDarkMuted,
    marginTop: 3,
  },
});
