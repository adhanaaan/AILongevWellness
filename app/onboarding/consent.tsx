import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, ShieldCheck } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TermsModal } from "@/components/ui/TermsModal";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const PRIVACY_POLICY_BODY = `We take the security of your wellness data seriously. This summary explains what we collect, how it's used, and who can see it during your time in the programme.

What we collect
We collect the information you provide during onboarding (profile, goals, lifestyle), any wearable, body composition, or lab data you choose to upload, and your ongoing check-ins inside the app.

How it's used
Your data is used to generate your personal wellness snapshot and to support the suggested discussion points your care team prepares for you. We never use your data for any purpose outside this programme.

Who can see it
Your assigned GP and TCM practitioner review your wellness snapshot before it's shared with you. No one outside your care team has access to your individual data.

Data handling
All data is encrypted in transit and at rest. You can request a copy of your data or ask for it to be deleted at any time by contacting the programme team.

By accepting, you confirm you've read this summary and agree to how your data will be handled during the programme.`;

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
  const [termsOpen, setTermsOpen] = useState(false);
  const allChecked = ITEMS.every((item) => checked[item.key]);

  function onItemPress(key: string) {
    if (key === "privacy") {
      setTermsOpen(true);
      return;
    }
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
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
                onPress={() => onItemPress(item.key)}
                activeOpacity={0.8}
              >
                <GlassCard
                  tint="light"
                  padding="md"
                  radius="2xl"
                  tintColor={isChecked ? colors.tealTint : undefined}
                  tintBorderColor={isChecked ? colors.teal : undefined}
                >
                  <View style={styles.itemRow}>
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && <Check size={15} color={colors.white} strokeWidth={3} />}
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

      {allChecked && (
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            You can withdraw your consent at any time.
          </Text>
          <Button size="lg" onPress={() => router.push("/onboarding/auth")}>
            Agree and continue
          </Button>
        </View>
      )}

      <TermsModal
        visible={termsOpen}
        title="Privacy & Data Handling"
        body={PRIVACY_POLICY_BODY}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          setChecked((prev) => ({ ...prev, privacy: true }));
          setTermsOpen(false);
        }}
      />
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
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
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
    gap: spacing.md,
  },
  footerNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
