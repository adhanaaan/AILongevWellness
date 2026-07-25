import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Brain } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { CalmConfirmation } from "@/components/onboarding/CalmConfirmation";
import { Button } from "@/components/ui/Button";
import { updateSectionStatusAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, spacing } from "@/lib/theme/tokens";

export default function CaptureRecognaizeIntroPage() {
  const router = useRouter();
  const { participantId } = useAuth();

  async function onContinue() {
    if (participantId) {
      await updateSectionStatusAction("recognize", "in_progress", participantId);
    }
    router.push("/onboarding/capture-recognaize");
  }

  return (
    <CaptureFlowStepper activeSection="recognize">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CalmConfirmation
          icon={<Brain size={24} color={colors.teal} />}
          title="ReCOGnAIze"
          subtitle="ReCOGnAIze is a cognitive assessment that feeds into your Mental pillar score, alongside your questionnaire, wearables, and lab data."
        />
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
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
