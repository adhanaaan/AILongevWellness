import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Check, ShieldCheck } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

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
        <GlassCard
          tint="light"
          padding="none"
          radius="full"
          style={styles.headerIcon}
        >
          <ShieldCheck size={24} color={colors.teal} />
        </GlassCard>
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
                onPress={() =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                activeOpacity={0.8}
              >
                <GlassCard
                  tint="light"
                  padding="md"
                  radius="2xl"
                  tintColor={isChecked ? "rgba(42,175,170,0.16)" : undefined}
                  tintBorderColor={isChecked ? colors.teal : undefined}
                >
                  <View style={styles.itemRow}>
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
                      <Text style={styles.itemDescription}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
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
  items: {
    marginTop: spacing["2xl"],
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
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
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  itemDescription: {
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
