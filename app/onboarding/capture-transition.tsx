import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { CaptureFlowStepper } from "@/components/layout/CaptureFlowStepper";
import { CalmConfirmation } from "@/components/onboarding/CalmConfirmation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TRIO_KEYS, isTrioComplete } from "@/lib/onboarding/flow";
import type { OnboardingProgress } from "@/lib/types/db";
import { colors, spacing } from "@/lib/theme/tokens";

export default function CaptureTransitionPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    if (!participantId) return;
    getOnboardingProgressAction(participantId).then(setProgress);
  }, [participantId]);

  const doneCount = progress ? TRIO_KEYS.filter((k) => progress.sections[k] === "done").length : 0;

  async function onContinue() {
    if (!participantId) return;
    const latest = await getOnboardingProgressAction(participantId);
    router.replace(isTrioComplete(latest) ? "/onboarding/capture-recognaize-intro" : "/onboarding/capture");
  }

  return (
    <CaptureFlowStepper activeSection="body_composition" disabled>
      <View style={styles.center}>
        <CalmConfirmation
          align="center"
          icon={<Sparkles size={24} color={colors.teal} />}
          title="Almost there"
          subtitle={`${doneCount} of 3 done — just a couple more sections to go.`}
        />
        <View style={styles.progressWrap}>
          <ProgressBar value={(doneCount / TRIO_KEYS.length) * 100} />
        </View>
      </View>

      <View style={styles.footer}>
        <Button size="lg" onPress={onContinue}>
          Continue
        </Button>
      </View>
    </CaptureFlowStepper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  progressWrap: {
    width: "100%",
    marginTop: spacing["2xl"],
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
