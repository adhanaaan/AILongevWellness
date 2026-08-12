import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Target,
  Check,
  Infinity as InfinityIcon,
  Zap,
  Scale,
  Shield,
  Moon,
  HeartPulse,
  type LucideIcon,
} from "lucide-react-native";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction, updateSectionStatusAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export interface Goal {
  label: string;
  description: string;
  icon: LucideIcon;
}

export const GOALS: Goal[] = [
  { label: "Longevity", description: "Build habits that add healthy years.", icon: InfinityIcon },
  { label: "Energy & focus", description: "Feel sharper and less drained.", icon: Zap },
  { label: "Weight management", description: "Find a sustainable, healthy weight.", icon: Scale },
  { label: "Stress resilience", description: "Handle pressure with more ease.", icon: Shield },
  { label: "Sleep quality", description: "Fall asleep faster and rest deeper.", icon: Moon },
  {
    label: "Cardiovascular fitness",
    description: "Strengthen your heart and stamina.",
    icon: HeartPulse,
  },
];

const SELECTED_GRADIENT_STOPS = [
  { offset: "0", color: `${colors.amber}00` },
  { offset: "1", color: `${colors.amber}59` },
];

export default function ProfileGoalsPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEditing = mode === "edit";

  const [loading, setLoading] = useState(true);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then((p) => {
      if (p) {
        setSelectedGoals(p.goals ?? []);
      }
      setLoading(false);
    });
  }, [participantId]);

  function toggleGoal(label: string) {
    setSelectedGoals((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  }

  const isValid = selectedGoals.length > 0;

  async function onContinue() {
    if (!participantId || !isValid) return;
    setError(null);
    setSaving(true);
    try {
      await updateParticipantAction(participantId, { goals: selectedGoals });
      if (isEditing) {
        router.back();
      } else {
        await updateSectionStatusAction("personal_info", "in_progress", participantId);
        router.push("/onboarding/profile-lifestyle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <Target size={24} color={colors.teal} />
        </GlassCard>

        <Text style={styles.title}>Wellness Goals</Text>
        <Text style={styles.subtitle}>
          Pick the areas you'd like to focus on — we'll tailor your insights around them.
        </Text>

        <View style={styles.grid}>
          {GOALS.map((goal) => {
            const selected = selectedGoals.includes(goal.label);
            const Icon = goal.icon;
            return (
              <TouchableOpacity
                key={goal.label}
                style={[styles.tile, selected && styles.tileSelected]}
                onPress={() => toggleGoal(goal.label)}
                activeOpacity={0.8}
              >
                {selected && <GradientOverlay stops={SELECTED_GRADIENT_STOPS} style={styles.tileGradient} />}
                <View style={styles.tileIconWrap}>
                  <Icon size={28} color={selected ? colors.amberDark : colors.inkMuted} />
                </View>
                <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>
                  {goal.label}
                </Text>
                <Text style={styles.tileDescription}>{goal.description}</Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Check size={14} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.reassurance}>
          This won't limit what your care team reviews for you.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={saving || !isValid} onPress={onContinue}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bone,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing["2xl"],
    gap: spacing.lg,
  },
  tile: {
    width: "47%",
    minHeight: 140,
    paddingVertical: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: spacing.sm,
  },
  tileSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.amberDark,
  },
  tileGradient: {
    borderRadius: radii.xl,
  },
  tileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  tileLabelSelected: {
    color: colors.ink,
  },
  tileDescription: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
    lineHeight: 16,
  },
  reassurance: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  checkBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
