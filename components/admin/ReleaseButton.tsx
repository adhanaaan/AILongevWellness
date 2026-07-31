import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Send } from "lucide-react-native";
import { Button } from "@/components/ui";
import { colors, fontSizes, spacing } from "@/lib/theme/tokens";
import { releaseCardAction } from "@/lib/data/actions";

interface ReleaseButtonProps {
  participantId: string;
  enabled: boolean;
}

export function ReleaseButton({ participantId, enabled }: ReleaseButtonProps) {
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    setError(null);
    setReleasing(true);
    try {
      await releaseCardAction(participantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release failed. Please try again.");
    } finally {
      setReleasing(false);
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        variant="primary"
        size="lg"
        iconLeft={<Send size={18} color={colors.white} />}
        disabled={!enabled || releasing}
        onPress={handleRelease}
      >
        {releasing ? "Releasing..." : "Release Card to Participant"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  error: {
    fontSize: fontSizes.labelMd,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
