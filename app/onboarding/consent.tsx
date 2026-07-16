import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Check, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Button } from "@/components/ui/Button";
import { colors, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

const ITEMS = [
  {
    key: "wellness",
    title: "Wellness programme",
    description:
      "I understand this is a wellness programme, not a medical diagnosis or treatment plan.",
  },
  {
    key: "reviewed",
    title: "Care team review",
    description:
      "I consent to my data being reviewed by the care team (GP and TCM practitioner) for personalised wellness insights.",
  },
  {
    key: "privacy",
    title: "Privacy & data handling",
    description:
      "I have read and agree to the privacy terms and data handling policy.",
  },
];

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = ITEMS.every((item) => checked[item.key]);

  return (
    <OnboardingStepper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerIcon}>
          <ShieldCheck size={24} color={colors.teal} />
        </View>
        <Text style={styles.title}>Consent & Disclaimer</Text>
        <Text style={styles.subtitle}>
          Before we begin, please review and confirm each item below.
        </Text>

        <View style={styles.items}>
          {ITEMS.map((item) => {
            const isChecked = Boolean(checked[item.key]);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.item, isChecked && styles.itemChecked]}
                onPress={() =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && <Check size={14} color={colors.white} />}
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          size="lg"
          disabled={!allChecked}
          onPress={() => router.push("/onboarding/profile")}
        >
          Agree and continue
        </Button>
      </View>
    </OnboardingStepper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.bold,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  items: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  itemChecked: {
    borderColor: colors.teal,
    backgroundColor: colors.tealTint,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
