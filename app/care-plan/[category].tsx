import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, X, Smile, Meh, Frown } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { repository } from "@/lib/data/mock";
import { listDailyLogsAction, upsertDailyLogAction, updateParticipantAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CARE_PLAN_CATEGORIES_BY_KEY } from "@/lib/carePlan/categories";
import type { SignedCard } from "@/lib/data/repository";
import type { DailyLog, Participant, PlanCategory } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, spacing } from "@/lib/theme/tokens";

const VALID_CATEGORIES: PlanCategory[] = ["nutrition", "exercise", "medications", "sleep", "mindfulness"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const HISTORY_BAR_TRACK_HEIGHT = 44;

const MOODS = [
  { key: "great", label: "Great", Icon: Smile, score: 9 },
  { key: "okay", label: "Okay", Icon: Meh, score: 6 },
  { key: "low", label: "Low", Icon: Frown, score: 3 },
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function moodKeyForScore(score: number): (typeof MOODS)[number]["key"] {
  return MOODS.slice().sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0].key;
}

function dayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday
  return DAYS[(weekday + 6) % 7]; // rotate so Monday is index 0, matching DAYS
}

/** Only medications and mindfulness are tracked — see CarePlanCategoryConfig.tracked. */
function historyFraction(category: PlanCategory, log: DailyLog | undefined, medicationCount: number): number {
  switch (category) {
    case "medications":
      return medicationCount > 0 ? Math.min(1, (log?.supplements ?? []).length / medicationCount) : 0;
    case "mindfulness":
      return Math.min(1, (log?.mood?.score ?? 0) / 10);
    default:
      return 0;
  }
}

export default function CarePlanCategoryPage() {
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { participantId } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [card, setCard] = useState<SignedCard | null>(null);
  const [newMedication, setNewMedication] = useState("");
  const [loaded, setLoaded] = useState(false);

  const category = VALID_CATEGORIES.includes(categoryParam as PlanCategory) ? (categoryParam as PlanCategory) : null;

  const loadData = useCallback(() => {
    if (!participantId) return;
    Promise.all([
      listDailyLogsAction(participantId),
      repository.getParticipant(participantId),
      repository.getSignedCard(participantId),
    ]).then(([l, p, c]) => {
      setLogs(l);
      setParticipant(p);
      setCard(c);
      setLoaded(true);
    });
  }, [participantId]);

  useEffect(() => {
    if (!category) {
      router.back();
      return;
    }
    if (!participantId) return;
    loadData();
    return repository.subscribe(loadData);
  }, [category, participantId, loadData, router]);

  if (!category || !loaded) return null;

  const config = CARE_PLAN_CATEGORIES_BY_KEY[category];
  const today = todayIso();
  const todayLog = logs.find((l) => l.log_date === today);
  const last7 = logs.slice(-7);
  const planItems = card?.aiDraft.care_plan?.[category] ?? [];
  const medicationCatalog = participant?.medications ?? [];

  async function patchToday(patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>) {
    if (!participantId) return;
    await upsertDailyLogAction(today, patch, participantId);
  }

  function setMood(key: (typeof MOODS)[number]["key"]) {
    const mood = MOODS.find((m) => m.key === key)!;
    patchToday({ mood: { score: mood.score } });
  }

  function toggleMedication(name: string, taken: boolean) {
    const current = todayLog?.supplements ?? [];
    const next = taken ? [...current, name] : current.filter((s) => s !== name);
    patchToday({ supplements: next });
  }

  async function addMedicationToCatalog() {
    const name = newMedication.trim();
    if (!name || !participantId) return;
    if (medicationCatalog.includes(name)) {
      setNewMedication("");
      return;
    }
    await updateParticipantAction(participantId, { medications: [...medicationCatalog, name] });
    setNewMedication("");
  }

  async function removeMedicationFromCatalog(name: string) {
    if (!participantId) return;
    await updateParticipantAction(participantId, { medications: medicationCatalog.filter((m) => m !== name) });
    if ((todayLog?.supplements ?? []).includes(name)) {
      await patchToday({ supplements: (todayLog?.supplements ?? []).filter((s) => s !== name) });
    }
  }

  const mood = todayLog?.mood ? moodKeyForScore(todayLog.mood.score) : null;
  const Icon = config.Icon;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIcon, { backgroundColor: `${config.color}1A` }]}>
            <Icon size={20} color={config.color} />
          </View>
          <Text style={styles.categoryName}>{config.label}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your plan</Text>
          {planItems.length > 0 ? (
            <View style={styles.planList}>
              {planItems.map((item, i) => (
                <View key={i} style={styles.planRow}>
                  <Text style={styles.planBullet}>{"•"}</Text>
                  <Text style={styles.planText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.fallbackText}>{config.fallback}</Text>
          )}
        </View>

        {config.tracked ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Track</Text>
              <Card padding="lg">
                {category === "mindfulness" && (
                  <>
                    <Text style={styles.trackLabel}>Mood today</Text>
                    <View style={styles.moodRow}>
                      {MOODS.map(({ key, label, Icon: MoodIcon }) => (
                        <TouchableOpacity
                          key={key}
                          style={[styles.moodOption, mood === key && styles.moodOptionActive]}
                          onPress={() => setMood(key)}
                        >
                          <MoodIcon size={18} color={mood === key ? colors.sageDark : colors.inkMuted} />
                          <Text style={[styles.moodOptionLabel, mood === key && styles.moodOptionLabelActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {category === "medications" && (
                  <View>
                    {medicationCatalog.length === 0 && (
                      <Text style={styles.fallbackText}>Add what you currently take below to start tracking it daily.</Text>
                    )}
                    {medicationCatalog.map((name) => (
                      <View key={name} style={styles.medRow}>
                        <Text style={styles.medName}>{name}</Text>
                        <View style={styles.medRowRight}>
                          <Toggle
                            checked={(todayLog?.supplements ?? []).includes(name)}
                            onChange={(v) => toggleMedication(name, v)}
                          />
                          <TouchableOpacity onPress={() => removeMedicationFromCatalog(name)} hitSlop={8}>
                            <X size={16} color={colors.inkMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <View style={styles.addMedRow}>
                      <TextInput
                        style={styles.addMedInput}
                        value={newMedication}
                        onChangeText={setNewMedication}
                        placeholder="e.g. Omega-3"
                        placeholderTextColor={colors.inkMuted}
                        onSubmitEditing={addMedicationToCatalog}
                      />
                      <Button size="sm" shape="md" variant="secondary" onPress={addMedicationToCatalog}>
                        Add
                      </Button>
                    </View>
                  </View>
                )}
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This week</Text>
              <Card padding="lg">
                {last7.length > 0 ? (
                  <View style={styles.barsContainer}>
                    {last7.map((log) => (
                      <View key={log.log_date} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: config.color,
                                height: Math.max(
                                  4,
                                  Math.round(historyFraction(category, log, medicationCatalog.length) * HISTORY_BAR_TRACK_HEIGHT)
                                ),
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.dayLabel}>{dayLabel(log.log_date)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.fallbackText}>Nothing logged yet this week.</Text>
                )}
              </Card>
            </View>
          </>
        ) : (
          <Text style={styles.untrackedNote}>
            This reflects your onboarding wearable and lab data — daily tracking isn&apos;t part of this
            category yet.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  section: {
    marginTop: spacing["2xl"],
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  planList: { gap: spacing.sm },
  planRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  planBullet: {
    fontSize: fontSizes.bodyMd,
    color: colors.sage,
    lineHeight: 22,
  },
  planText: {
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 22,
  },
  fallbackText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    fontStyle: "italic",
    lineHeight: 22,
  },
  trackValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  trackLabel: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  moodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  moodOption: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  moodOptionActive: {
    borderColor: colors.sage,
    backgroundColor: colors.sageTint,
  },
  moodOptionLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodOptionLabelActive: {
    color: colors.sageDark,
  },
  untrackedNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    fontStyle: "italic",
    marginTop: spacing["2xl"],
    lineHeight: 18,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  medName: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  medRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  addMedRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addMedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    backgroundColor: colors.surface,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barTrack: {
    height: HISTORY_BAR_TRACK_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: radii.full,
    opacity: 0.85,
  },
  dayLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
});
