import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Watch, PersonStanding, FileText, Brain, ChevronRight, type LucideIcon } from "lucide-react-native";
import { HubSectionCard } from "@/components/participant/HubSectionCard";
import { getOnboardingProgressAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CAPTURE_SECTIONS, deriveSectionState, type CaptureSectionId } from "@/lib/onboarding/flow";
import type { OnboardingProgress } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

// "Add your data" — an optional enrichment surface reached from inside the app,
// NOT an onboarding gate. The quick quiz (name + goal) is all that's required to
// use the app; everything here just sharpens the snapshot, so it's a plain list
// of tappable optional sources with no completion pressure. (The questionnaire
// section is intentionally excluded — it's handled by app/onboarding/quiz.tsx.)

const SECTION_ICON: Partial<Record<CaptureSectionId, LucideIcon>> = {
  wearables: Watch,
  body_composition: PersonStanding,
  lab_reports: FileText,
  recognize: Brain,
};

const SECTION_DESCRIPTION: Partial<Record<CaptureSectionId, string>> = {
  wearables: "Connect a wearable — syncs heart rate, sleep and activity.",
  body_composition: "Upload a body-composition scan.",
  lab_reports: "Upload a lab report — we pull out the key results.",
  recognize: "A short cognitive check.",
};

export default function CaptureHubPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    if (!participantId) return;
    function load() {
      getOnboardingProgressAction(participantId!).then(setProgress);
    }
    load();
    return repository.subscribe(load);
  }, [participantId]);

  const sections = CAPTURE_SECTIONS.filter((s) => s.id !== "questionnaire");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add your data</Text>
        <Text style={styles.subtitle}>
          All optional — the more you share, the sharper your wellness snapshot gets.
        </Text>

        <View style={styles.list}>
          {sections.map((section) => {
            const state = progress ? deriveSectionState(progress, section) : "available";
            const Icon = SECTION_ICON[section.id] ?? FileText;
            return (
              <HubSectionCard
                key={section.id}
                icon={Icon}
                title={section.label}
                description={SECTION_DESCRIPTION[section.id] ?? ""}
                state={state}
                optional={section.optional}
                onPress={() => router.push(section.route as never)}
              />
            );
          })}
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editHeader}>Edit your profile</Text>
          {(
            [
              { label: "Personal info", route: "/onboarding/profile" },
              { label: "Wellness goals", route: "/onboarding/profile-goals" },
              { label: "Lifestyle", route: "/onboarding/profile-lifestyle" },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.editRow}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: item.route, params: { mode: "edit" } })}
            >
              <Text style={styles.editRowText}>{item.label}</Text>
              <ChevronRight size={18} color={colors.inkMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone, maxWidth: 448, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing["2xl"],
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  list: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  editSection: {
    marginTop: spacing["2xl"],
  },
  editHeader: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fontSizes.overline,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editRowText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
});
