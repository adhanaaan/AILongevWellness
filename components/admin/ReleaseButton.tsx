import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Send } from "lucide-react-native";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme/tokens";
import { releaseCardAction } from "@/lib/data/actions";

interface ReleaseButtonProps {
  participantId: string;
  enabled: boolean;
}

export function ReleaseButton({ participantId, enabled }: ReleaseButtonProps) {
  const [releasing, setReleasing] = useState(false);

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await releaseCardAction(participantId);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        variant="primary"
        size="lg"
        shape="full"
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
});
