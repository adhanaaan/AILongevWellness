import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, X, Smile, Meh, Frown } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { WellnessDisclaimer } from "@/components/participant/WellnessDisclaimer";
import { ProgressRing } from "@/components/participant/ProgressRing";
import { CarePlanSectionLabel } from "@/components/participant/CarePlanSectionLabel";
import { AskAvaButton } from "@/components/participant/AskAvaButton";
import { repository } from "@/lib/data/mock";
import { listDailyLogsAction, upsertDailyLogAction, updateParticipantAction } from "@/lib/data/actions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isSupabaseConfigured } from "@/lib/config/env";
import { CARE_PLAN_CATEGORIES_BY_KEY, normalizePlanItem } from "@/lib/carePlan/categories";
import type { SignedCard } from "@/lib/data/repository";
import type { AiDraft, DailyLog, Participant, PlanCategory } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, fontWeights, radii, shadows, spacing } from "@/lib/theme/tokens";
import { GradientOverlay } from "@/components/ui/GradientOverlay";

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
  const [pendingDraft, setPendingDraft] = useState<AiDraft | null>(null);
  const [newMedication, setNewMedication] = useState("");
  const [loaded, setLoaded] = useState(false);

  const category = VALID_CATEGORIES.includes(categoryParam as PlanCategory) ? (categoryParam as PlanCategory) : null;

  const loadData = useCallback(() => {
    if (!participantId) return;
    Promise.all([
      listDailyLogsAction(participantId),
      repository.getParticipant(participantId),
      repository.getSignedCard(participantId),
      repository.getAiDraft(participantId),
    ]).then(([l, p, c, d]) => {
      setLogs(l);
      setParticipant(p);
      setCard(c);
      setPendingDraft(d);
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

  if (!category) return null;
  if (!loaded) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const config = CARE_PLAN_CATEGORIES_BY_KEY[category];
  const today = todayIso();
  const todayLog = logs.find((l) => l.log_date === today);
  const last7 = logs.slice(-7);
  const realPlan = card?.aiDraft.care_plan?.[category] ?? pendingDraft?.care_plan?.[category];
  const hasRealPlan = Boolean(realPlan && realPlan.length > 0);
  const planItems = hasRealPlan ? realPlan! : config.starter;
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

  // Per-category header ring (tracked categories only): medications shows today's
  // adherence, mindfulness shows how many of the last 7 days were checked in.
  const medTakenToday = (todayLog?.supplements ?? []).filter((s) => medicationCatalog.includes(s)).length;
  const moodDaysThisWeek = last7.filter((l) => l.mood).length;
  const ringData =
    config.tracked && category === "medications"
      ? {
          fraction: medicationCatalog.length > 0 ? medTakenToday / medicationCatalog.length : 0,
          center: `${medTakenToday}/${medicationCatalog.length}`,
          caption: "TODAY",
        }
      : config.tracked && category === "mindfulness"
        ? { fraction: moodDaysThisWeek / 7, center: `${moodDaysThisWeek}/7`, caption: "THIS WK" }
        : null;

  // A plan backfilled onto a delivered card after sign-off reads "in review,"
  // never "reviewed" — see the same logic on the Care Plan tab.
  const latestSignedAt = (card?.reviews ?? []).reduce(
    (max, r) => (r.signed_at ? Math.max(max, Date.parse(r.signed_at)) : max),
    0
  );
  const draftGeneratedAt = card?.aiDraft.generated_at ? Date.parse(card.aiDraft.generated_at) : 0;
  const carePlanPendingReview =
    isSupabaseConfigured && Boolean(card) && hasRealPlan && draftGeneratedAt > latestSignedAt;
  const reviewed = Boolean(card) && !carePlanPendingReview;
  const showPill = hasRealPlan;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeInView>
          {/* Category hero header */}
          <View style={[styles.hero, { backgroundColor: `${config.color}12` }]}>
            <View style={styles.heroLeft}>
              <View style={[styles.heroIcon, { backgroundColor: `${config.color}22` }]}>
                <Icon size={24} color={config.color} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.categoryName}>{config.label}</Text>
                {showPill ? (
                  <View style={[styles.pill, reviewed ? styles.pillReviewed : styles.pillPending]}>
                    <Text style={[styles.pillText, reviewed ? styles.pillReviewedText : styles.pillPendingText]}>
                      {reviewed ? "Care-team reviewed" : "AI draft · in review"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.heroSub}>Starter guidance · personalizes after review</Text>
                )}
              </View>
            </View>
            {ringData && (
              <ProgressRing
                fraction={ringData.fraction}
                size={68}
                stroke={7}
                from={config.color}
                to={config.color}
                trackColor={colors.surfaceMuted}
              >
                <Text style={[styles.ringCenter, { color: config.color }]}>{ringData.center}</Text>
                <Text style={styles.ringCaption}>{ringData.caption}</Text>
              </ProgressRing>
            )}
          </View>

          <View style={styles.section}>
            <CarePlanSectionLabel style={styles.sectionLabel}>Your plan</CarePlanSectionLabel>
            <Card padding="lg">
              <View style={styles.planList}>
                {planItems.map((raw, i) => {
                  const item = normalizePlanItem(raw);
                  // Legacy drafts (pre title/detail split) coerce the whole sentence
                  // into `title` with no detail — render those as prose, not a bold
                  // "title", so an old plan reads as a paragraph rather than a wall.
                  const isLegacy = !item.detail && item.title.length > 64;
                  return (
                    <View key={i} style={[styles.planCard, { borderColor: `${config.color}24` }]}>
                      <GradientOverlay
                        stops={[
                          { offset: "0", color: `${config.color}1F` },
                          { offset: "1", color: `${config.color}00` },
                        ]}
                      />
                      <Text style={[styles.planGhostNum, { color: `${config.color}66` }]}>{i + 1}</Text>
                      <View style={styles.planItemText}>
                        <Text style={isLegacy ? styles.planProse : styles.planTitle}>{item.title}</Text>
                        {item.detail ? <Text style={styles.planDetail}>{item.detail}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
            {hasRealPlan && (
              <View style={styles.askAva}>
                <AskAvaButton
                  question={`Can you explain my ${config.label.toLowerCase()} plan in more detail?`}
                  label={`Ask Ava about my ${config.label.toLowerCase()} plan`}
                />
              </View>
            )}
          </View>

          {config.tracked ? (
            <>
              <View style={styles.section}>
                <CarePlanSectionLabel style={styles.sectionLabel}>Track</CarePlanSectionLabel>
                <Card padding="lg">
                  {category === "mindfulness" && (
                    <>
                      <Text style={styles.trackLabel}>How are you feeling today?</Text>
                      <View style={styles.moodRow}>
                        {MOODS.map(({ key, label, Icon: MoodIcon }) => (
                          <TouchableOpacity
                            key={key}
                            style={[styles.moodOption, mood === key && styles.moodOptionActive]}
                            onPress={() => setMood(key)}
                          >
                            <MoodIcon size={18} color={mood === key ? colors.sageDark : colors.inkMuted} />
                            <Text style={[styles.moodOptionLabel, mood === key && styles.moodOptionLabelActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {category === "medications" && (
                    <View>
                      {medicationCatalog.length === 0 && (
                        <Text style={styles.fallbackText}>
                          Add what you currently take below to start tracking it daily.
                        </Text>
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
                <CarePlanSectionLabel style={styles.sectionLabel}>This week</CarePlanSectionLabel>
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
                                    Math.round(
                                      historyFraction(category, log, medicationCatalog.length) * HISTORY_BAR_TRACK_HEIGHT
                                    )
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
            <View style={styles.section}>
              <Card padding="lg">
                <Text style={styles.untrackedNote}>
                  This plan reflects your onboarding wearable and lab data. Daily tracking isn&apos;t part of this
                  category yet — connect a wearable to fill it in automatically.
                </Text>
              </Card>
            </View>
          )}
          <WellnessDisclaimer />
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
    // Centered phone-width column on a wide (laptop) browser; unchanged on phones.
    width: "100%",
    maxWidth: 448,
    alignSelf: "center",
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderRadius: radii["2xl"],
    padding: spacing.xl,
    marginTop: spacing.sm,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: { flex: 1, minWidth: 0, gap: 5 },
  categoryName: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
  },
  heroSub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.md,
  },
  pillReviewed: { backgroundColor: colors.sageTint },
  pillPending: { backgroundColor: colors.terracottaTint },
  pillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pillReviewedText: { color: colors.sage },
  pillPendingText: { color: colors.terracottaInk },
  ringCenter: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 19,
  },
  ringCaption: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.inkMuted,
    marginTop: 1,
  },
  section: {
    marginTop: spacing["2xl"],
  },
  sectionLabel: {
    marginTop: 0,
  },
  askAva: { marginTop: spacing.md },
  planList: { gap: spacing.md },
  planCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.card,
  },
  planGhostNum: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 30,
    lineHeight: 34,
    width: 30,
    flexShrink: 0,
    textAlign: "center",
  },
  planItemText: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  planTitle: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    lineHeight: 22,
  },
  planProse: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 23,
  },
  planDetail: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  fallbackText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    fontStyle: "italic",
    lineHeight: 22,
  },
  trackLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  moodRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodOptionLabelActive: {
    color: colors.sageDark,
  },
  untrackedNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    lineHeight: 21,
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
    width: "70%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: radii.full,
  },
  dayLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
});
