import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { OnboardingStepper } from "@/components/layout/OnboardingStepper";
import { Input } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateParticipantAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const GOAL_OPTIONS = [
  "Longevity",
  "Energy & focus",
  "Weight management",
  "Stress resilience",
  "Sleep quality",
  "Cardiovascular fitness",
];

const SEX_OPTIONS = ["Male", "Female", "Other"];
const EXERCISE_OPTIONS = ["Rarely", "Sometimes", "Regularly"];
const ALCOHOL_OPTIONS = ["Never", "Occasionally", "Regularly"];

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function OptionSelector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((opt) => {
          const isSelected = value.toLowerCase() === opt.toLowerCase();
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.optionChip, isSelected && styles.optionChipSelected]}
              onPress={() => onChange(opt.toLowerCase())}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionChipText,
                  isSelected && styles.optionChipTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { participantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enteredBy, setEnteredBy] = useState("me");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [exercise, setExercise] = useState("regularly");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState("occasionally");
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
        setGoals(p.goals ?? []);
      }
      setLoading(false);
    });
  }, [participantId]);

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

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
        goals,
      });
      router.push("/onboarding/capture");
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
          <Text style={styles.title}>Your Profile</Text>
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
            ? "Tell us about yourself to personalise your wellness assessment."
            : "A care team member is entering this on your behalf."}
        </Text>

        <SectionHeader title="Personal Information" />

        <View style={styles.form}>
          <Input label="Full name" value={name} onChangeText={setName} />
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <OptionSelector
                label="Sex"
                options={SEX_OPTIONS}
                value={sex}
                onChange={setSex}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                label="Height (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                label="Weight (kg)"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <SectionHeader title="Wellness Goals" />

        <View style={styles.chips}>
          {GOAL_OPTIONS.map((goal) => (
            <Chip
              key={goal}
              selected={goals.includes(goal)}
              onToggle={() => toggleGoal(goal)}
            >
              {goal}
            </Chip>
          ))}
        </View>

        <SectionHeader title="Lifestyle" />

        <View style={styles.lifestyleSection}>
          <OptionSelector
            label="Exercise frequency"
            options={EXERCISE_OPTIONS}
            value={exercise}
            onChange={setExercise}
          />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Smoking</Text>
            <Toggle checked={smoking} onChange={setSmoking} label="" />
          </View>
          <OptionSelector
            label="Alcohol consumption"
            options={ALCOHOL_OPTIONS}
            value={alcohol}
            onChange={setAlcohol}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={saving || !isValid} onPress={onContinue}>
          Continue to capture
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  form: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  lifestyleSection: {
    gap: spacing.lg,
  },
  optionGroup: {},
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionChip: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionChipSelected: {
    backgroundColor: colors.tealTint,
    borderColor: colors.teal,
  },
  optionChipText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
  },
  optionChipTextSelected: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.tealDark,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  toggleLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
  },
});
