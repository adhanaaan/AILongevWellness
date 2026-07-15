import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Lock, CheckCircle2 } from "lucide-react-native";
import { Card, Button, Input, Textarea } from "@/components/ui";
import { colors, fontSizes, fontWeights, spacing, radii } from "@/lib/theme/tokens";
import { signOffAction } from "@/lib/data/actions";
import type { ReviewStage, Review } from "@/lib/types/db";

interface SignOffStageProps {
  stage: ReviewStage;
  participantId: string;
  review: Review | undefined;
  locked: boolean;
}

const stageLabels: Record<ReviewStage, string> = {
  gp: "GP Review",
  tcm: "TCM Review",
};

export function SignOffStage({
  stage,
  participantId,
  review,
  locked,
}: SignOffStageProps) {
  const [name, setName] = useState("");
  const [credential, setCredential] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSigned = review?.signed_at !== null && review?.signed_at !== undefined;

  const handleSignOff = async () => {
    if (!name.trim() || !credential.trim()) return;
    setSubmitting(true);
    try {
      await signOffAction(participantId, stage, {
        reviewer_name: name.trim(),
        reviewer_credential: credential.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (locked) {
    return (
      <Card>
        <View style={styles.lockedContainer}>
          <Lock size={20} color={colors.inkMuted} />
          <View style={styles.lockedTextContainer}>
            <Text style={styles.stageTitle}>{stageLabels[stage]}</Text>
            <Text style={styles.lockedMessage}>
              Complete the previous stage to unlock.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  if (isSigned && review) {
    return (
      <Card>
        <View style={styles.signedContainer}>
          <CheckCircle2 size={20} color={colors.sageDark} />
          <View style={styles.signedContent}>
            <Text style={styles.stageTitle}>{stageLabels[stage]}</Text>
            <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
            <Text style={styles.reviewerCredential}>
              {review.reviewer_credential}
            </Text>
            {review.notes ? (
              <Text style={styles.notes}>{review.notes}</Text>
            ) : null}
            <Text style={styles.signedAt}>
              Signed{" "}
              {new Date(review.signed_at!).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.stageTitle}>{stageLabels[stage]}</Text>
      <View style={styles.form}>
        <Input
          label="Reviewer Name"
          value={name}
          onChangeText={setName}
          placeholder="Dr. Jane Smith"
        />
        <Input
          label="Credential"
          value={credential}
          onChangeText={setCredential}
          placeholder="MBBS, FRACP"
        />
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any review notes..."
          multiline
        />
        <Button
          variant="primary"
          onPress={handleSignOff}
          disabled={!name.trim() || !credential.trim() || submitting}
        >
          {submitting ? "Signing..." : "Sign Off"}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedMessage: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  signedContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  signedContent: {
    flex: 1,
  },
  stageTitle: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  reviewerName: {
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.medium,
    color: colors.charcoal,
  },
  reviewerCredential: {
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 2,
  },
  notes: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  signedAt: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
});
