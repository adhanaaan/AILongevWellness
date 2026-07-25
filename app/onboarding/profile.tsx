import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { SelectField, type SelectFieldOption } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction, updateSectionStatusAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const SEX_OPTIONS: SelectFieldOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

function range(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}

const AGE_OPTIONS: SelectFieldOption[] = range(18, 100).map((n) => ({ label: n, value: n }));
const HEIGHT_OPTIONS: SelectFieldOption[] = range(140, 210).map((n) => ({
  label: `${n} cm`,
  value: n,
}));
const WEIGHT_OPTIONS: SelectFieldOption[] = range(40, 150).map((n) => ({
  label: `${n} kg`,
  value: n,
}));

export default function ProfilePersonalPage() {
  const router = useRouter();
  const { participantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then((p) => {
      if (p) {
        // "New participant" is the server-side default for a brand-new sign-up
        // (no metadata was ever passed) — treat it as "nothing entered yet"
        // rather than showing that placeholder text as if it were their name.
        const isUnfilled = p.name === "New participant";
        setName(isUnfilled ? "" : p.name);
        setAge(isUnfilled ? "" : String(p.age));
        setSex(p.sex);
        setHeight(isUnfilled ? "" : String(p.height_cm));
        setWeight(isUnfilled ? "" : String(p.weight_kg));
      }
      setLoading(false);
    });
  }, [participantId]);

  const ageNum = Number(age);
  const heightNum = Number(height);
  const weightNum = Number(weight);
  const isValid =
    name.trim().length > 0 &&
    Number.isFinite(ageNum) &&
    ageNum > 0 &&
    Number.isFinite(heightNum) &&
    heightNum > 0 &&
    Number.isFinite(weightNum) &&
    weightNum > 0;

  async function onContinue() {
    if (!participantId || !isValid) return;
    setSaving(true);
    try {
      await updateParticipantAction(participantId, {
        name: name.trim(),
        age: ageNum,
        sex: sex as any,
        height_cm: heightNum,
        weight_kg: weightNum,
      });
      await updateSectionStatusAction("personal_info", "in_progress", participantId);
      router.push("/onboarding/profile-wellness-intro");
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <User size={24} color={colors.teal} />
        </GlassCard>

        <Text style={styles.title}>Personal Information</Text>
        <Text style={styles.subtitle}>Let's start with a few basics about you.</Text>

        <Card padding="lg" style={styles.profileCard}>
          <View style={styles.nameField}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.inkMuted}
              textAlign="center"
            />
          </View>

          <SelectField
            label="Sex at Birth"
            value={sex}
            options={SEX_OPTIONS}
            onChange={setSex}
          />

          <View style={styles.row}>
            <SelectField
              label="Age"
              value={age}
              options={AGE_OPTIONS}
              onChange={setAge}
              style={styles.rowField}
            />
            <SelectField
              label="Height"
              value={height}
              options={HEIGHT_OPTIONS}
              onChange={setHeight}
              style={styles.rowField}
            />
            <SelectField
              label="Weight"
              value={weight}
              options={WEIGHT_OPTIONS}
              onChange={setWeight}
              style={styles.rowField}
            />
          </View>
        </Card>
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
  profileCard: {
    marginTop: spacing["2xl"],
    gap: spacing["2xl"],
  },
  nameField: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    borderStyle: "dashed",
    paddingBottom: spacing.md,
  },
  nameInput: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
    paddingVertical: 0,
  },
  row: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  rowField: {
    flexGrow: 1,
    flexBasis: 0,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
