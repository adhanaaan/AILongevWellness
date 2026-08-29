import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Card } from "@/components/ui";
import { Input } from "@/components/ui/Field";
import { createParticipantAction } from "@/lib/data/actions";
import type { Sex } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const digits = (t: string) => t.replace(/[^0-9]/g, "");

export default function NewParticipantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    name.trim().length > 0 && sex !== null && age.length > 0 && height.length > 0 && weight.length > 0;

  async function onCreate() {
    if (!valid || !sex) return;
    setError(null);
    setSaving(true);
    try {
      const p = await createParticipantAction({
        name: name.trim(),
        sex,
        age: Number(age),
        height_cm: Number(height),
        weight_kg: Number(weight),
      });
      router.replace(`/admin/participants/${p.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the patient.");
      setSaving(false);
    }
  }

  return (
    <AdminShell title="New patient">
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={18} color={colors.inkMuted} />
          <Text style={styles.backText}>Patients</Text>
        </TouchableOpacity>

        <Text style={styles.title}>New patient</Text>
        <Text style={styles.subtitle}>
          Create a clinician-managed record. You can add reports and generate the analysis right after.
        </Text>

        <Card style={styles.card}>
          <Input label="Full name" value={name} onChangeText={setName} placeholder="e.g. Goh Kok Tiong" autoFocus />

          <Text style={styles.fieldLabel}>Sex at birth</Text>
          <View style={styles.chipRow}>
            {SEX_OPTIONS.map((o) => {
              const selected = sex === o.value;
              return (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSex(o.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <Input
              label="Age"
              value={age}
              onChangeText={(t) => setAge(digits(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="58"
              containerStyle={styles.col}
            />
            <Input
              label="Height (cm)"
              value={height}
              onChangeText={(t) => setHeight(digits(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="175"
              containerStyle={styles.col}
            />
            <Input
              label="Weight (kg)"
              value={weight}
              onChangeText={(t) => setWeight(digits(t))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="72"
              containerStyle={styles.col}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button size="lg" disabled={!valid || saving} onPress={onCreate} style={styles.submit}>
            {saving ? "Creating…" : "Create patient"}
          </Button>
        </Card>
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, maxWidth: 560, width: "100%", alignSelf: "center" },
  back: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  backText: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.inkMuted },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineMd,
    color: colors.charcoal,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  card: { gap: spacing.md },
  fieldLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
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
  row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  col: { flexGrow: 1, flexBasis: 0 },
  error: { fontFamily: fontFamilies.bodyMedium, fontSize: fontSizes.labelMd, color: colors.danger },
  submit: { marginTop: spacing.md },
});
