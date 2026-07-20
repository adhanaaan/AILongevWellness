import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { User, ShieldCheck, FileText, LogOut } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { Participant } from "@/lib/types/db";
import { colors, fontSizes } from "@/lib/theme/tokens";

export default function SettingsPage() {
  const { participantId, signOut } = useAuth();
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then(setParticipant);
  }, [participantId]);

  if (!participant) return null;

  return (
    <MobileShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Settings</Text>

        <Card style={styles.profileCard}>
          <Avatar initials={participant.name.slice(0, 1)} size="lg" />
          <View>
            <Text style={styles.profileName}>{participant.name}</Text>
            <Text style={styles.profileMeta}>
              {participant.age} · {participant.sex} · {participant.height_cm}cm ·{" "}
              {participant.weight_kg}kg
            </Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <User size={18} color={colors.sageDark} />
          <View>
            <Text style={styles.infoLabel}>Goals</Text>
            <Text style={styles.infoValue}>
              {participant.goals.join(", ")}
            </Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <ShieldCheck size={18} color={colors.sageDark} />
          <View>
            <Text style={styles.infoLabel}>Privacy & consent</Text>
            <Text style={styles.infoValue}>
              You agreed to the wellness consent terms during onboarding.
            </Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <FileText size={18} color={colors.sageDark} />
          <View>
            <Text style={styles.infoLabel}>About AI Wellness</Text>
            <Text style={styles.infoValue}>
              Executive retreat pilot · wellness insights, not diagnosis.
            </Text>
          </View>
        </Card>

        {isSupabaseConfigured && (
          <Button variant="secondary" iconLeft={<LogOut size={16} color={colors.sageDark} />} onPress={signOut}>
            Sign out
          </Button>
        )}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 16, paddingBottom: 32 },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  profileName: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  profileMeta: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  infoValue: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
