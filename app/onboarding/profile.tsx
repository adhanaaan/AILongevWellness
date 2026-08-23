import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { SelectField, type SelectFieldOption } from "@/components/ui/SelectField";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { generateDraft } from "@/lib/ai/client";
import { colors, fontFamilies, fontSizes, spacing } from "@/lib/theme/tokens";

const SEX_OPTIONS: SelectFieldOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

// Age/height/weight are typed directly (testers found the long scroll pickers
// tedious). These are gentle plausibility bounds — enough to catch a typo like
// "999", not to gatekeep — with the field left editable while out of range.
const AGE_MIN = 13;
const AGE_MAX = 120;
const HEIGHT_MIN = 120;
const HEIGHT_MAX = 230;
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250;

/** Keep only digits (height/weight/age are whole numbers in our units). */
function digitsOnly(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

export default function ProfilePersonalPage() {
  const router = useRouter();
  const { participantId, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const ageError = age.length > 0 && (ageNum < AGE_MIN || ageNum > AGE_MAX)
    ? `Enter an age between ${AGE_MIN} and ${AGE_MAX}.`
    : undefined;
  const heightError = height.length > 0 && (heightNum < HEIGHT_MIN || heightNum > HEIGHT_MAX)
    ? `Enter a height between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm.`
    : undefined;
  const weightError = weight.length > 0 && (weightNum < WEIGHT_MIN || weightNum > WEIGHT_MAX)
    ? `Enter a weight between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`
    : undefined;

  const isValid =
    name.trim().length > 0 &&
    age.length > 0 &&
    !ageError &&
    height.length > 0 &&
    !heightError &&
    weight.length > 0 &&
    !weightError;

  async function onContinue() {
    if (!participantId || !isValid) return;
    setError(null);
    setSaving(true);
    try {
      await updateParticipantAction(participantId, {
        name: name.trim(),
        age: ageNum,
        sex: sex as any,
        height_cm: heightNum,
        weight_kg: weightNum,
      });
      // Age is the participant's chronological age, and sex/height/weight feed the
      // sex-aware reference ranges and age clocks -- so a change here has to
      // re-derive the draft, or the Insights card keeps showing the pre-edit age
      // until the next capture upload. Fire-and-forget, matching the capture
      // screens; generateDraft's REGENERATABLE_STATES guard means a signed card is
      // never silently altered.
      if (isSupabaseConfigured && session?.access_token) {
        generateDraft(session.access_token, participantId).catch(() => {});
      }
      // Reached only as an edit surface from the Data Capture hub now — the old
      // sequential questionnaire chain was replaced by app/onboarding/quiz.tsx.
      router.back();
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
            <Input
              label="Age"
              value={age}
              onChangeText={(t) => setAge(digitsOnly(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="58"
              error={ageError}
              containerStyle={styles.rowField}
            />
            <Input
              label="Height (cm)"
              value={height}
              onChangeText={(t) => setHeight(digitsOnly(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="175"
              error={heightError}
              containerStyle={styles.rowField}
            />
            <Input
              label="Weight (kg)"
              value={weight}
              onChangeText={(t) => setWeight(digitsOnly(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="72"
              error={weightError}
              containerStyle={styles.rowField}
            />
          </View>
        </Card>

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
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
    marginTop: spacing.lg,
  },
});
