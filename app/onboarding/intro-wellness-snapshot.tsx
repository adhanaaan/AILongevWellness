import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles, Watch, PersonStanding, FileText, Brain } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { CalmConfirmation } from "@/components/onboarding/CalmConfirmation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const POINTS = [
  { Icon: Watch, label: "Wearables" },
  { Icon: PersonStanding, label: "Body composition" },
  { Icon: FileText, label: "Lab reports" },
  { Icon: Brain, label: "ReCOGnAIze" },
];

export default function IntroWellnessSnapshotPage() {
  const router = useRouter();

  return (
    <CaptureFlowStepper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CalmConfirmation
          icon={<Sparkles size={24} color={colors.teal} />}
          title="Your Wellness Snapshot"
          subtitle="A few more sections to go. Each one adds another layer to your snapshot — you can complete them in any order."
        />

        <Card padding="lg" style={styles.pointsCard}>
          <Text style={styles.pointsHeading}>What's coming</Text>
          <Text style={styles.pointsBody}>
            Wearables, body composition, lab reports, and ReCOGnAIze all roll up into your
            Vascular, Metabolic, and Mental pillar scores.
          </Text>
          <View style={styles.pointsList}>
            {POINTS.map(({ Icon, label }) => (
              <View key={label} style={styles.pointRow}>
                <View style={styles.pointIcon}>
                  <Icon size={16} color={colors.tealDark} />
                </View>
                <Text style={styles.pointLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" onPress={() => router.push("/onboarding/capture")}>
          Let's go
        </Button>
      </View>
    </CaptureFlowStepper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  pointsCard: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  pointsHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  pointsBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  pointsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  pointLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
