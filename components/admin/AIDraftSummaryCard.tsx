import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Card, Button, StatusBadge } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { updateAiDraftAction } from "@/lib/data/actions";
import type { AiDraft } from "@/lib/types/db";

interface AIDraftSummaryCardProps {
  aiDraft: AiDraft;
  participantId: string;
  editable: boolean;
}

export function AIDraftSummaryCard({
  aiDraft,
  participantId,
  editable,
}: AIDraftSummaryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [strengths, setStrengths] = useState(aiDraft.strengths.join("\n"));
  const [areasToMonitor, setAreasToMonitor] = useState(
    aiDraft.areas_to_monitor.join("\n")
  );
  const [suggestedFocus, setSuggestedFocus] = useState(
    aiDraft.suggested_focus.join("\n")
  );

  const handleSave = async () => {
    await updateAiDraftAction(participantId, {
      strengths: strengths.split("\n").filter((s) => s.trim()),
      areas_to_monitor: areasToMonitor.split("\n").filter((s) => s.trim()),
      suggested_focus: suggestedFocus.split("\n").filter((s) => s.trim()),
      edited_by_admin: true,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setStrengths(aiDraft.strengths.join("\n"));
    setAreasToMonitor(aiDraft.areas_to_monitor.join("\n"));
    setSuggestedFocus(aiDraft.suggested_focus.join("\n"));
    setIsEditing(false);
  };

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.heading}>AI Draft Summary</Text>
        <View style={styles.headerRight}>
          {aiDraft.edited_by_admin && (
            <StatusBadge status="monitor" label="Edited" />
          )}
          {editable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </View>
      </View>

      <Section title="Strengths">
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={strengths}
            onChangeText={setStrengths}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <BulletList items={aiDraft.strengths} />
        )}
      </Section>

      <Section title="Areas to Monitor">
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={areasToMonitor}
            onChangeText={setAreasToMonitor}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <BulletList items={aiDraft.areas_to_monitor} />
        )}
      </Section>

      <Section title="Suggested Focus">
        {isEditing ? (
          <TextInput
            style={styles.textArea}
            value={suggestedFocus}
            onChangeText={setSuggestedFocus}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <BulletList items={aiDraft.suggested_focus} />
        )}
      </Section>

      {isEditing && (
        <View style={styles.editActions}>
          <Button variant="primary" size="sm" onPress={handleSave}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onPress={handleCancel}>
            Cancel
          </Button>
        </View>
      )}
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  textArea: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    backgroundColor: colors.surface,
    minHeight: 80,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
});
