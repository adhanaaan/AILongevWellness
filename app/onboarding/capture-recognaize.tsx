import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { CalmConfirmation } from "@/components/onboarding/CalmConfirmation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { updateSectionStatusAction, updateCaptureChannelAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

export default function CaptureRecognaizePage() {
  const router = useRouter();
  const { participantId } = useAuth();

  async function onContinue() {
    if (participantId) {
      await updateSectionStatusAction("recognize", "acknowledged", participantId);
      await updateCaptureChannelAction(participantId, "recognize", {
        status: "complete",
        entered_by: "participant",
      });
    }
    // ReCOGnAIze is the one section that doesn't return to the hub — it flows
    // straight into Calculating, so replace rather than push.
    router.replace("/onboarding/capture-calculating");
  }

  return (
    <CaptureFlowStepper activeSection="recognize">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CalmConfirmation
          icon={<Sparkles size={24} color={colors.teal} />}
          title="You're all set here"
          subtitle="There's nothing to complete on this screen yet."
        />

        <Card padding="lg" style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <View style={styles.noticeIcon}>
              <Sparkles size={16} color={colors.tealDark} />
            </View>
            <Text style={styles.noticeHeading}>On the roadmap</Text>
          </View>
          <Text style={styles.noticeBody}>
            Full ReCOGnAIze integration is still on the roadmap. For now, this screen is
            informational only — there&apos;s nothing to complete here, and no assessment data is
            collected today. Tap Continue to move on to your wellness summary.
          </Text>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" onPress={onContinue}>
          Continue
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
  noticeCard: {
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.md,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeHeading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  noticeBody: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
