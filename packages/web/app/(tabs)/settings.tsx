import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { User, ShieldCheck, FileText, BookOpen, ChevronRight, LogOut, Bell, Clock, Fingerprint } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { useDailyReminder } from "@/lib/platform/useDailyReminder";
import { useAppLock } from "@/lib/platform/useAppLock";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { Participant } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

export default function SettingsPage() {
  const router = useRouter();
  const { participantId, signOut } = useAuth();
  const [participant, setParticipant] = useState<Participant | null>(null);
  // Only renders inside the native shell; a browser cannot wake the app on a schedule.
  const reminder = useDailyReminder();
  // Both of these are native-shell only, and both report false in a browser.
  const appLock = useAppLock();

  useEffect(() => {
    if (!participantId) return;
    repository.getParticipant(participantId).then(setParticipant);
  }, [participantId]);

  if (!participant) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell name={participant.name}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Settings</Text>

        <Card padding="lg" style={styles.profileCard}>
          <Avatar initials={participant.name.slice(0, 1)} size="lg" />
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{participant.name}</Text>
            {(() => {
              // Age/sex/height/weight are all skippable in the quiz — only join
              // the ones that are actually set, so a quiz-only account doesn't
              // read "undefined · undefined · undefinedcm".
              const parts = [
                participant.age ? `${participant.age}` : null,
                participant.sex || null,
                participant.height_cm ? `${participant.height_cm}cm` : null,
                participant.weight_kg ? `${participant.weight_kg}kg` : null,
              ].filter(Boolean);
              return parts.length > 0 ? (
                <Text style={styles.profileMeta}>{parts.join(" · ")}</Text>
              ) : null;
            })()}
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Your profile</Text>
        <Card padding="none" style={styles.group}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <User size={18} color={colors.sageDark} />
            </View>
            <View style={styles.infoTextGrow}>
              <Text style={styles.infoLabel}>Goals</Text>
              <Text style={styles.infoValue}>{participant.goals.join(", ")}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => router.push("/privacy")}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <ShieldCheck size={18} color={colors.sageDark} />
            </View>
            <View style={styles.infoTextGrow}>
              <Text style={styles.infoLabel}>Privacy & consent</Text>
              <Text style={styles.infoValue}>
                {participant.consent_withdrawn_at
                  ? "Consent withdrawn. Tap to view."
                  : "Manage your consent and see what data we hold."}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.inkMuted} />
          </TouchableOpacity>
        </Card>

        {(reminder.available || appLock.available) && (
          <>
            <Text style={styles.sectionLabel}>On this device</Text>
            <Card padding="none" style={styles.group}>
              {reminder.available && (
                <>
                  <View style={styles.infoRow}>
                    <View style={styles.iconCircle}>
                      <Bell size={18} color={colors.sageDark} />
                    </View>
                    <View style={styles.infoTextGrow}>
                      <Text style={styles.infoLabel}>Daily check-in reminder</Text>
                      <Text style={styles.infoValue}>
                        {reminder.permissionDenied
                          ? "Notifications are turned off for AI Wellness in your device settings."
                          : "A gentle nudge to log how you're feeling."}
                      </Text>
                    </View>
                    <Toggle checked={reminder.enabled} onChange={reminder.setEnabled} />
                  </View>
                  {reminder.enabled && (
                    <>
                      <View style={styles.divider} />
                      <TouchableOpacity
                        style={styles.infoRow}
                        onPress={reminder.cycleTime}
                        activeOpacity={0.7}
                      >
                        <View style={styles.iconCircle}>
                          <Clock size={18} color={colors.sageDark} />
                        </View>
                        <View style={styles.infoTextGrow}>
                          <Text style={styles.infoLabel}>Remind me at</Text>
                          <Text style={styles.infoValue}>Tap to change</Text>
                        </View>
                        <Text style={styles.reminderTime}>{reminder.timeLabel}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {appLock.available && (
                <>
                  {reminder.available && <View style={styles.divider} />}
                  <View style={styles.infoRow}>
                    <View style={styles.iconCircle}>
                      <Fingerprint size={18} color={colors.sageDark} />
                    </View>
                    <View style={styles.infoTextGrow}>
                      <Text style={styles.infoLabel}>Require Face ID or fingerprint</Text>
                      <Text style={styles.infoValue}>
                        {appLock.notEnrolled
                          ? "Set up Face ID or a fingerprint in your device settings first."
                          : "Lock the app when you haven't used it for a while."}
                      </Text>
                    </View>
                    <Toggle checked={appLock.enabled} onChange={appLock.setEnabled} />
                  </View>
                </>
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>About</Text>
        <Card padding="none" style={styles.group}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <FileText size={18} color={colors.sageDark} />
            </View>
            <View style={styles.infoTextGrow}>
              <Text style={styles.infoLabel}>About AI Wellness</Text>
              <Text style={styles.infoValue}>
                Executive retreat pilot · wellness insights, not diagnosis.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => router.push("/methodology")}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <BookOpen size={18} color={colors.sageDark} />
            </View>
            <View style={styles.infoTextGrow}>
              <Text style={styles.infoLabel}>Methodology & Sources</Text>
              <Text style={styles.infoValue}>
                How your scores are calculated, and where the reference ranges come from.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.inkMuted} />
          </TouchableOpacity>
        </Card>

        {isSupabaseConfigured && (
          <View style={styles.signOut}>
            <Button variant="secondary" iconLeft={<LogOut size={16} color={colors.sageDark} />} onPress={signOut}>
              Sign out
            </Button>
          </View>
        )}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: spacing.md, paddingBottom: spacing["3xl"] },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
    marginBottom: spacing.xs,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  profileText: { flex: 1 },
  profileName: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  profileMeta: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  group: { overflow: "hidden" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  infoTextGrow: { flex: 1 },
  infoLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  infoValue: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  reminderTime: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.sageDark,
  },
  signOut: { marginTop: spacing.md },
});
