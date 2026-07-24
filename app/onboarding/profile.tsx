import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { User, Plus } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SelectField, type SelectFieldOption } from "@/components/ui/SelectField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

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
  const [enteredBy, setEnteredBy] = useState("me");
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
      router.push("/onboarding/profile-goals");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <OnboardingStepper>
        <View style={styles.center}>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </OnboardingStepper>
    );
  }

  return (
    <OnboardingStepper>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard tint="light" padding="none" radius="full" style={styles.headerIcon}>
          <User size={24} color={colors.teal} />
        </GlassCard>

        <View style={styles.headerRow}>
          <Text style={styles.title}>Personal Information</Text>
          <SegmentedControl
            options={[
              { value: "me", label: "Me" },
              { value: "admin", label: "Admin" },
            ]}
            value={enteredBy}
            onChange={setEnteredBy}
          />
        </View>
        <Text style={styles.subtitle}>
          {enteredBy === "me"
            ? "Let's start with a few basics about you."
            : "A care team member is entering this on your behalf."}
        </Text>

        <Card padding="lg" style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <User size={32} color={colors.inkMuted} />
            </View>
            <View style={styles.avatarBadge}>
              <Plus size={14} color={colors.white} />
            </View>
          </View>

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
    </OnboardingStepper>
  );
}

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  avatarSection: {
    alignSelf: "center",
    width: 96,
    height: 96,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
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
