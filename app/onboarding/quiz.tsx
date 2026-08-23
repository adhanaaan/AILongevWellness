import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GOALS } from "@/lib/onboarding/goals";
import { updateParticipantAction, updateCaptureChannelAction, submitCaptureAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { generateDraft } from "@/lib/ai/client";
import type { AlcoholDrinksPerWeek, ExerciseFrequency, Sex } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, lineHeights, radii, spacing } from "@/lib/theme/tokens";

// A light, Bumble-style card stack — the single onboarding questionnaire. It
// replaced the old multi-screen chain (now removed); the standalone
// profile / profile-goals / profile-lifestyle screens survive only as edit
// surfaces reached from the Data Capture hub. Only Name + one Goal are required
// to reach the app; the basics and lifestyle cards are skippable and can be
// edited later from that hub. The app tabs are gated on auth only
// (ParticipantGuard), so finishing here routes straight into the app.

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];
const EXERCISE_OPTIONS: { label: string; value: ExerciseFrequency }[] = [
  { label: "Rarely", value: "rarely" },
  { label: "Sometimes", value: "sometimes" },
  { label: "Regularly", value: "regularly" },
];
const ALCOHOL_OPTIONS: { label: string; value: AlcoholDrinksPerWeek }[] = [
  { label: "None", value: "none" },
  { label: "1–7", value: "1_to_7" },
  { label: "8–14", value: "8_to_14" },
  { label: "15–21", value: "15_to_21" },
  { label: "21+", value: "21_plus" },
];

const digitsOnly = (t: string) => t.replace(/[^0-9]/g, "");
const TOTAL_STEPS = 4;

export default function QuizPage() {
  const router = useRouter();
  const { participantId, session } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [exercise, setExercise] = useState<ExerciseFrequency | null>(null);
  const [smoking, setSmoking] = useState<boolean | null>(null);
  const [alcohol, setAlcohol] = useState<AlcoholDrinksPerWeek | null>(null);

  const canAdvance =
    step === 0 ? name.trim().length > 0 : step === 1 ? goals.length > 0 : true;
  const isOptional = step >= 2;
  const isLast = step === TOTAL_STEPS - 1;

  function toggleGoal(label: string) {
    setGoals((g) => (g.includes(label) ? g.filter((x) => x !== label) : [...g, label]));
  }

  async function finish() {
    if (!participantId) return;
    setError(null);
    setSaving(true);
    try {
      const patch: Record<string, unknown> = { name: name.trim(), goals };
      if (sex) patch.sex = sex;
      if (age) patch.age = Number(age);
      if (height) patch.height_cm = Number(height);
      if (weight) patch.weight_kg = Number(weight);
      if (exercise) patch.exercise_frequency = exercise;
      if (smoking !== null) patch.smoking = smoking;
      if (alcohol) patch.alcohol_drinks_per_week = alcohol;
      await updateParticipantAction(participantId, patch as never);
      // Mark the questionnaire (manual) channel complete so the capture hub and
      // any progress views reflect it — the rest of capture stays optional.
      await updateCaptureChannelAction(participantId, "manual", {
        status: "complete",
        entered_by: "participant",
      });
      // Advance into the review pipeline (capturing -> ai_drafted) so the care
      // team can actually review and deliver this participant's card. Without
      // this the quiz-only path stays in "capturing" forever and never reaches
      // the review queue. ReCOGnAIze/labs are optional enrichment added after.
      await submitCaptureAction(participantId);
      // Kick off the first AI draft from the basics, which also advances
      // ai_drafted -> gp_review (fire-and-forget, real backend). If it fails the
      // admin console's "Advance to review" recovery card handles it.
      if (isSupabaseConfigured && session?.access_token) {
        generateDraft(session.access_token, participantId).catch(() => {});
      }
      router.replace("/(tabs)/card");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save — please try again.");
      setSaving(false);
    }
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep((s) => s - 1)} hitSlop={12}>
            <ArrowLeft size={22} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>Your first name is enough.</Text>
            <View style={styles.body}>
              <Input value={name} onChangeText={setName} placeholder="Your name" autoFocus />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>What brings you here?</Text>
            <Text style={styles.subtitle}>Pick what matters most — choose as many as you like.</Text>
            <View style={styles.body}>
              {GOALS.map((g) => {
                const selected = goals.includes(g.label);
                return (
                  <TouchableOpacity key={g.label} onPress={() => toggleGoal(g.label)} activeOpacity={0.8}>
                    <Card padding="md" style={selected ? styles.choiceSelected : undefined}>
                      <View style={styles.choiceRow}>
                        <g.icon size={20} color={selected ? colors.tealDark : colors.inkMuted} />
                        <View style={styles.choiceText}>
                          <Text style={styles.choiceLabel}>{g.label}</Text>
                          <Text style={styles.choiceDesc}>{g.description}</Text>
                        </View>
                        {selected && <Check size={18} color={colors.tealDark} />}
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>A few basics</Text>
            <Text style={styles.subtitle}>Optional — this sharpens your snapshot. Skip if you like.</Text>
            <View style={styles.body}>
              <View style={styles.chipRow}>
                {SEX_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={sex === o.value} onPress={() => setSex(o.value)} />
                ))}
              </View>
              <View style={styles.threeCol}>
                <Input label="Age" value={age} onChangeText={(t) => setAge(digitsOnly(t))} keyboardType="number-pad" maxLength={3} placeholder="58" containerStyle={styles.col} />
                <Input label="Height (cm)" value={height} onChangeText={(t) => setHeight(digitsOnly(t))} keyboardType="number-pad" maxLength={3} placeholder="175" containerStyle={styles.col} />
                <Input label="Weight (kg)" value={weight} onChangeText={(t) => setWeight(digitsOnly(t))} keyboardType="number-pad" maxLength={3} placeholder="72" containerStyle={styles.col} />
              </View>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>Your lifestyle</Text>
            <Text style={styles.subtitle}>Optional — a quick picture of your day-to-day.</Text>
            <View style={styles.body}>
              <Text style={styles.fieldLabel}>Exercise</Text>
              <View style={styles.chipRow}>
                {EXERCISE_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={exercise === o.value} onPress={() => setExercise(o.value)} />
                ))}
              </View>
              <Text style={styles.fieldLabel}>Do you smoke?</Text>
              <View style={styles.chipRow}>
                <Chip label="No" selected={smoking === false} onPress={() => setSmoking(false)} />
                <Chip label="Yes" selected={smoking === true} onPress={() => setSmoking(true)} />
              </View>
              <Text style={styles.fieldLabel}>Alcohol (drinks / week)</Text>
              <View style={styles.chipRow}>
                {ALCOHOL_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={alcohol === o.value} onPress={() => setAlcohol(o.value)} />
                ))}
              </View>
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={!canAdvance || saving} onPress={next}>
          {isLast ? (saving ? "Finishing…" : "Finish") : "Continue"}
        </Button>
        {isOptional && !isLast && (
          <TouchableOpacity onPress={() => setStep((s) => s + 1)} style={styles.skip} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        {isOptional && isLast && (
          <TouchableOpacity onPress={finish} style={styles.skip} disabled={saving} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip &amp; finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone, maxWidth: 448, alignSelf: "center", width: "100%" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radii.full, backgroundColor: colors.teal },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing["2xl"], paddingTop: spacing.xl, paddingBottom: spacing.lg },
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
    lineHeight: lineHeights.bodyMd,
  },
  body: { marginTop: spacing["2xl"], gap: spacing.md },
  choiceSelected: { borderColor: colors.teal, borderWidth: 1.5, backgroundColor: colors.tealTint },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  choiceText: { flex: 1 },
  choiceLabel: { fontFamily: fontFamilies.bodySemiBold, fontSize: fontSizes.bodyMd, color: colors.ink },
  choiceDesc: { fontFamily: fontFamilies.body, fontSize: fontSizes.labelMd, color: colors.inkMuted, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  chipText: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.inkMuted },
  chipTextSelected: { color: colors.tealDark },
  threeCol: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  col: { flexGrow: 1, flexBasis: 0 },
  fieldLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginTop: spacing.md,
  },
  error: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.danger, marginTop: spacing.lg },
  footer: { paddingHorizontal: spacing["2xl"], paddingVertical: spacing.lg, gap: spacing.sm },
  skip: { alignItems: "center", paddingVertical: spacing.sm },
  skipText: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.inkMuted },
});
