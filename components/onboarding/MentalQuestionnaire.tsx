import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  WHO5_ITEMS,
  WHO5_OPTIONS,
  PSS4_ITEMS,
  PSS4_OPTIONS,
  type QuestionnaireItem,
  type ResponseOption,
} from "@/lib/ai/mentalQuestionnaire";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

// Self-contained WHO-5 + PSS-4 form. Kept independent of the reaction-time test
// so recognaize-lite can replace that half without touching this. Collects
// answers and hands them back; the parent owns the submit + transition.
export interface MentalQuestionnaireProps {
  onComplete: (who5: number[], pss4: number[]) => void;
  submitting?: boolean;
  error?: string | null;
}

function QuestionBlock({
  index,
  item,
  options,
  value,
  onSelect,
}: {
  index: number;
  item: QuestionnaireItem;
  options: ResponseOption[];
  value: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionText}>
        {index}. {item.text}
      </Text>
      <View style={styles.optionsRow}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MentalQuestionnaire({ onComplete, submitting, error }: MentalQuestionnaireProps) {
  const [who5, setWho5] = useState<(number | null)[]>(Array(WHO5_ITEMS.length).fill(null));
  const [pss4, setPss4] = useState<(number | null)[]>(Array(PSS4_ITEMS.length).fill(null));

  const allAnswered = who5.every((v) => v !== null) && pss4.every((v) => v !== null);

  function setAt(list: (number | null)[], setList: (v: (number | null)[]) => void, i: number, v: number) {
    const next = [...list];
    next[i] = v;
    setList(next);
  }

  return (
    <View style={styles.wrap}>
      <Card padding="lg" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How you&apos;ve been feeling</Text>
        <Text style={styles.sectionHint}>Over the last two weeks…</Text>
        {WHO5_ITEMS.map((item, i) => (
          <QuestionBlock
            key={item.id}
            index={i + 1}
            item={item}
            options={WHO5_OPTIONS}
            value={who5[i]}
            onSelect={(v) => setAt(who5, setWho5, i, v)}
          />
        ))}
      </Card>

      <Card padding="lg" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Stress this past month</Text>
        <Text style={styles.sectionHint}>In the last month, how often have you…</Text>
        {PSS4_ITEMS.map((item, i) => (
          <QuestionBlock
            key={item.id}
            index={i + 1}
            item={item}
            options={PSS4_OPTIONS}
            value={pss4[i]}
            onSelect={(v) => setAt(pss4, setPss4, i, v)}
          />
        ))}
      </Card>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        size="lg"
        disabled={!allAnswered || submitting}
        onPress={() => onComplete(who5 as number[], pss4 as number[])}
        style={styles.submit}
      >
        {submitting ? "Saving…" : "Continue"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingBottom: spacing.lg },
  sectionCard: { gap: spacing.md },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  sectionHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: -spacing.xs,
  },
  question: { marginTop: spacing.md, gap: spacing.sm },
  questionText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
    lineHeight: 20,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  optionText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  optionTextSelected: { color: colors.tealDark },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
  },
  submit: { marginTop: spacing.sm },
});
