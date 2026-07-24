import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { Activity } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import {
  colors,
  fontFamilies,
  fontSizes,
  lineHeights,
  radii,
  spacing,
  teal,
} from "@/lib/theme/tokens";

// Echoes the app's own logo mark, an orange dot-trail resolving into the
// green wordmark, rather than inventing a new palette pairing.
export function CheckInCallout() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <LinearGradient id="checkin" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.amberLighter} />
            <Stop offset="1" stopColor={teal[200]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#checkin)" />
      </Svg>

      <View style={styles.iconCircle}>
        <Activity size={18} color={colors.sageDark} />
      </View>
      <Text style={styles.eyebrow}>WHILE YOU WAIT</Text>
      <Text style={styles.headline}>Today's check-in is still open</Text>
      <Text style={styles.body}>
        A quick log of sleep, activity, and mood keeps your care team's
        picture current.
      </Text>
      <Button size="lg" style={styles.button} onPress={() => router.push("/(tabs)/tracking")}>
        Log today's check-in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    overflow: "hidden",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassLightBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1.2,
    color: colors.charcoal,
    opacity: 0.65,
    marginTop: spacing.md,
  },
  headline: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    lineHeight: lineHeights.headlineSm,
    color: colors.charcoal,
    letterSpacing: -0.2,
    marginTop: spacing.xs,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    lineHeight: lineHeights.bodyMd,
    color: colors.charcoal,
    opacity: 0.75,
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.sageDark,
  },
});
