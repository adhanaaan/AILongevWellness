import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Card, Button, StatusBadge } from "@/components/ui";
import { colors, fontFamilies, fontSizes, spacing, radii } from "@/lib/theme/tokens";
import { updateAiDraftAction } from "@/lib/data/actions";
import { CARE_PLAN_CATEGORIES, normalizePlanItem } from "@/lib/carePlan/categories";
import type { AiDraft, CarePlan, PlanCategory, PlanItem } from "@/lib/types/db";

const EMPTY_CARE_PLAN: CarePlan = {
  nutrition: [],
  exercise: [],
  medications: [],
  sleep: [],
  mindfulness: [],
};

// One item per line, "Title — detail" (em dash separates the action from its
// supporting line; a line with no dash is treated as a title-only item).
const ITEM_SEP = " — ";

function itemToLine(item: PlanItem): string {
  return item.detail ? `${item.title}${ITEM_SEP}${item.detail}` : item.title;
}

function lineToItem(line: string): PlanItem {
  const idx = line.indexOf(ITEM_SEP);
  if (idx < 0) return { title: line.trim() };
  return { title: line.slice(0, idx).trim(), detail: line.slice(idx + ITEM_SEP.length).trim() };
}

function linesFor(carePlan: CarePlan | undefined, category: PlanCategory): string {
  return (carePlan?.[category] ?? []).map((i) => itemToLine(normalizePlanItem(i))).join("\n");
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
      CARE_PLAN_CATEGORIES.map(({ key }) => [
        key,
        drafts[key]
          .split("\n")
          .filter((s) => s.trim())
          .map(lineToItem),
      ])
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
  // Coalesce per key: a partial/legacy/backfilled care_plan jsonb may be missing
  // a category, and `carePlan[key].length` on undefined would blank-screen the
  // whole review page.
  const itemsFor = (key: keyof typeof carePlan) => carePlan[key] ?? [];
  const isEmpty = CARE_PLAN_CATEGORIES.every(({ key }) => itemsFor(key).length === 0);

  return (
    <Card padding="lg">
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
        const items = itemsFor(key);
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
                placeholder="One item per line — use ' — ' to add a detail"
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

function BulletList({ items }: { items: PlanItem[] }) {
  return (
    <View>
      {items.map((raw, index) => {
        const item = normalizePlanItem(raw);
        return (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>{"•"}</Text>
            <View style={styles.bulletBody}>
              <Text style={styles.bulletText}>{item.title}</Text>
              {item.detail ? <Text style={styles.bulletDetail}>{item.detail}</Text> : null}
            </View>
          </View>
        );
      })}
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
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
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
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  bulletBody: {
    flex: 1,
  },
  bulletText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 22,
  },
  bulletDetail: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 19,
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
