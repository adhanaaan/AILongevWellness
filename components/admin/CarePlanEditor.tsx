import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Card, Button, StatusBadge } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { updateAiDraftAction } from "@/lib/data/actions";
import { CARE_PLAN_CATEGORIES } from "@/lib/carePlan/categories";
import type { AiDraft, CarePlan, PlanCategory } from "@/lib/types/db";

const EMPTY_CARE_PLAN: CarePlan = {
  nutrition: [],
  exercise: [],
  medications: [],
  sleep: [],
  mindfulness: [],
};

function linesFor(carePlan: CarePlan | undefined, category: PlanCategory): string {
  return (carePlan?.[category] ?? []).join("\n");
}

interface CarePlanEditorProps {
  aiDraft: AiDraft;
  participantId: string;
  editable: boolean;
}

export function CarePlanEditor({ aiDraft, participantId, editable }: CarePlanEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<PlanCategory, string>>(() =>
    Object.fromEntries(
      CARE_PLAN_CATEGORIES.map(({ key }) => [key, linesFor(aiDraft.care_plan, key)])
    ) as Record<PlanCategory, string>
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const care_plan = Object.fromEntries(
      CARE_PLAN_CATEGORIES.map(({ key }) => [key, drafts[key].split("\n").filter((s) => s.trim())])
    ) as CarePlan;
    setError(null);
    setSaving(true);
    try {
      await updateAiDraftAction(participantId, { care_plan, edited_by_admin: true });
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDrafts(
      Object.fromEntries(
        CARE_PLAN_CATEGORIES.map(({ key }) => [key, linesFor(aiDraft.care_plan, key)])
      ) as Record<PlanCategory, string>
    );
    setError(null);
    setIsEditing(false);
  };

  const carePlan = aiDraft.care_plan ?? EMPTY_CARE_PLAN;
  const isEmpty = CARE_PLAN_CATEGORIES.every(({ key }) => carePlan[key].length === 0);

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.heading}>Care Plan</Text>
        <View style={styles.headerRight}>
          {aiDraft.edited_by_admin && <StatusBadge status="monitor" label="Edited" />}
          {editable && !isEditing && (
            <Button variant="ghost" size="sm" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </View>
      </View>

      {!isEditing && isEmpty && (
        <Text style={styles.emptyText}>
          No care plan drafted yet — generate or regenerate the AI draft to populate one.
        </Text>
      )}

      {CARE_PLAN_CATEGORIES.map(({ key, label }) => {
        const items = carePlan[key];
        if (!isEditing && items.length === 0) return null;
        return (
          <View key={key} style={styles.section}>
            <Text style={styles.sectionTitle}>{label}</Text>
            {isEditing ? (
              <TextInput
                style={styles.textArea}
                value={drafts[key]}
                onChangeText={(text) => setDrafts((prev) => ({ ...prev, [key]: text }))}
                multiline
                textAlignVertical="top"
                placeholder="One item per line"
              />
            ) : (
              <BulletList items={items} />
            )}
          </View>
        );
      })}

      {isEditing && (
        <>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.editActions}>
            <Button variant="primary" size="sm" onPress={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onPress={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </View>
        </>
      )}
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bullet}>{"•"}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSizes.headlineMd,
    fontWeight: fontWeights.bold,
    color: colors.charcoal,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  bullet: {
    fontSize: fontSizes.bodyMd,
    color: colors.sage,
    marginRight: spacing.sm,
    lineHeight: 22,
  },
  bulletText: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    flex: 1,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    fontStyle: "italic",
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    backgroundColor: colors.surface,
    minHeight: 60,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  error: {
    fontSize: fontSizes.labelMd,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
