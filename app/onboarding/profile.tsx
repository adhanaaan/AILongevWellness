import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { updateParticipantAction } from "@/lib/data/actions";
import { DEMO_PARTICIPANT_ID } from "@/lib/data/mock";
import { repository } from "@/lib/data/mock";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";

const GOAL_OPTIONS = [
  "Longevity",
  "Energy & focus",
  "Weight management",
  "Stress resilience",
  "Sleep quality",
  "Cardiovascular fitness",
];

export default function ProfilePage() {
  const router = useRouter();
  const participant = React.useMemo(
    () => {
      const p = repository.getParticipant(DEMO_PARTICIPANT_ID);
      return p;
    },
    []
  );

  const [enteredBy, setEnteredBy] = useState("me");
  const [name, setName] = useState("James Chen");
  const [age, setAge] = useState("58");
  const [sex, setSex] = useState("male");
  const [height, setHeight] = useState("178");
  const [weight, setWeight] = useState("82");
  const [goals, setGoals] = useState<string[]>(["Longevity", "Energy & focus", "Cardiovascular fitness"]);
  const [exercise, setExercise] = useState("regularly");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState("occasionally");
  const [saving, setSaving] = useState(false);

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function onContinue() {
    setSaving(true);
    try {
      await updateParticipantAction(DEMO_PARTICIPANT_ID, {
        name,
        age: Number(age),
        sex: sex as any,
        height_cm: Number(height),
        weight_kg: Number(weight),
        goals,
      });
      router.push("/onboarding/capture");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Your profile</Text>
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
            ? "Fill this in yourself."
            : "A care team member is entering this on your behalf."}
        </Text>

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
              <Input
                label="Sex"
                value={sex}
                onChangeText={setSex}
                placeholder="male / female / other"
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

          <View>
            <Text style={styles.fieldLabel}>Goals</Text>
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
          </View>

          <View style={styles.healthBox}>
            <Text style={styles.fieldLabel}>Basic health</Text>
            <Input
              label="Exercise frequency"
              value={exercise}
              onChangeText={setExercise}
              placeholder="rarely / sometimes / regularly"
            />
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Smoking</Text>
              <Toggle checked={smoking} onChange={setSmoking} label="Smoking" />
            </View>
            <Input
              label="Alcohol"
              value={alcohol}
              onChangeText={setAlcohol}
              placeholder="never / occasionally / regularly"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button size="lg" disabled={saving} onPress={onContinue}>
          Continue to capture
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 8,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  healthBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    gap: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
