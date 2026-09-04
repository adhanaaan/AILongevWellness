import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Check, HeartPulse, Moon, Activity, AlertTriangle } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientOrb } from "@/components/ui/GradientOrb";
import { colors, fontFamilies, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

// Where Terra redirects the participant's browser after the connect widget
// finishes (see WearableConnectOptions — auth_success_redirect_url points here,
// auth_failure_redirect_url points here with ?failed=1). Terra appends its own
// params (user_id, reference_id, resource); we read the provider from `resource`.
//
// This is deliberately a standalone confirmation, not a silent bounce back to the
// capture screen: a wearable connect should feel like it did something, and the
// biomarkers themselves sync in the background (minutes to hours for the first
// pull), so the screen sets that expectation instead of looking empty/broken.

const SYNCS = [
  { Icon: HeartPulse, label: "Heart rate & HRV" },
  { Icon: Moon, label: "Sleep duration & quality" },
  { Icon: Activity, label: "Daily activity" },
];

function providerLabel(resource: string | undefined): string {
  if (!resource) return "Your device";
  const s = resource.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function WearableConnectedPage() {
  const router = useRouter();
  const { resource, provider, failed } = useLocalSearchParams<{
    resource?: string;
    provider?: string;
    failed?: string;
  }>();

  const didFail = failed === "1" || failed === "true";
  const name = providerLabel(resource ?? provider);

  if (didFail) {
    return (
      <View style={styles.page}>
        <GradientOrb tone="amber" size={280} style={styles.orbTopLeft} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <View style={[styles.badge, styles.badgeFail]}>
              <AlertTriangle size={40} color={colors.danger} />
            </View>
            <Text style={styles.title}>Couldn&rsquo;t connect</Text>
            <Text style={styles.subtitle}>
              We couldn&rsquo;t link {name.toLowerCase() === "your device" ? "your device" : name} this
              time. It happens — give it another go, or add it later.
            </Text>
          </View>
          <View style={styles.footer}>
            <Button
              size="lg"
              style={styles.cta}
              onPress={() => router.replace("/onboarding/capture-wearables-intro")}
            >
              Try again
            </Button>
            <Button
              variant="ghost"
              size="lg"
              style={styles.cta}
              onPress={() => router.replace("/onboarding/capture")}
            >
              I&rsquo;ll add this later
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <GradientOrb tone="teal" size={280} style={styles.orbTopLeft} />
      <GradientOrb tone="amber" size={240} style={styles.orbBottomRight} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={[styles.badge, styles.badgeOk]}>
            <Check size={44} color={colors.white} strokeWidth={3} />
          </View>
          <Text style={styles.title}>{name} connected</Text>
          <Text style={styles.subtitle}>
            Your device is linked. We&rsquo;ll sync your data in the background — your snapshot
            updates as it arrives.
          </Text>

          <Card padding="lg" style={styles.card}>
            <Text style={styles.cardHeading}>What we&rsquo;re pulling in</Text>
            {SYNCS.map(({ Icon, label }) => (
              <View key={label} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Icon size={16} color={colors.tealDark} />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
              </View>
            ))}
            <Text style={styles.note}>
              The first sync can take a little while — especially for historical data — so it may
              not appear on your card right away.
            </Text>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button size="lg" style={styles.cta} onPress={() => router.replace("/(tabs)/card")}>
            Continue
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
    overflow: "hidden",
    backgroundColor: colors.bone,
  },
  orbTopLeft: { top: -80, left: -100, opacity: 0.5 },
  orbBottomRight: { bottom: -60, right: -100, opacity: 0.4 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  badgeOk: { backgroundColor: colors.success },
  badgeFail: { backgroundColor: colors.dangerTint },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyLg,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: lineHeights.bodyLg,
    maxWidth: 340,
  },
  card: {
    marginTop: spacing["2xl"],
    width: "100%",
    gap: spacing.md,
  },
  cardHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  note: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  cta: { width: "100%" },
});
