import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Watch, PersonStanding, FileText, ChevronRight, type LucideIcon } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";
import { listDailyLogsAction, upsertDailyLogAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CARE_PLAN_CATEGORIES } from "@/lib/carePlan/categories";
import { CarePlanCategoryCard, type CarePlanTodayStatus } from "@/components/participant/CarePlanCategoryCard";
import { CarePlanTodayHero } from "@/components/participant/CarePlanTodayHero";
import { TodayActionsList } from "@/components/participant/TodayActionsList";
import type { AiDraft, DailyLog, Participant, PlanCategory } from "@/lib/types/db";
import type { SignedCard } from "@/lib/data/repository";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ADD_DATA_ROWS: Array<{ Icon: LucideIcon; label: string; description: string; route: string }> = [
  {
    Icon: FileText,
    label: "Lab or CGM report",
    description: "New screening, lab panel, or glucose monitor summary",
    route: "/onboarding/capture-lab-reports-intro",
  },
  {
    Icon: Watch,
    label: "Wearable export",
    description: "Apple Health export — heart rate, sleep, activity",
    route: "/onboarding/capture-wearables-intro",
  },
  {
    Icon: PersonStanding,
    label: "Body composition scan",
    description: "A new scan printout or photo",
    route: "/onboarding/capture-body-composition-intro",
  },
];

// Fixed pixel height for the trend bar track: percentage heights on a flex-column
// child don't reliably resolve on react-native-web, so bar fill is computed in px.
const TREND_BAR_TRACK_HEIGHT = 44;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

function trendValue(log: DailyLog | undefined): number | null {
  if (!log?.mood) return null;
  return log.mood.score * 10;
}

function dayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday
  return DAYS[(weekday + 6) % 7]; // rotate so Monday is index 0, matching DAYS
}

/** Only medications and mindfulness have a daily self-report — see CarePlanCategoryConfig.tracked. */
function todayStatus(
  category: PlanCategory,
  todayLog: DailyLog | undefined,
  participant: Participant | null
): CarePlanTodayStatus | null {
  switch (category) {
    case "medications": {
      const catalog = participant?.medications ?? [];
      if (catalog.length === 0) return { text: "Add what you take", done: false };
      const taken = (todayLog?.supplements ?? []).length;
      return { text: `${taken}/${catalog.length} taken`, done: catalog.length > 0 && taken >= catalog.length };
    }
    case "mindfulness":
      return todayLog?.mood
        ? { text: moodLabel(todayLog.mood.score), done: true }
        : { text: "Not checked in yet", done: false };
    default:
      return null;
  }
}

function moodLabel(score: number): string {
  if (score >= 8) return "Feeling great";
  if (score >= 5) return "Feeling okay";
  return "Feeling low";
}

export default function TrackingPage() {
  const router = useRouter();
  const { participantId } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [card, setCard] = useState<SignedCard | null>(null);
  const [pendingDraft, setPendingDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(true);

  function uploadMoreData(route: string) {
    router.push({ pathname: route as never, params: { mode: "edit" } });
  }

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
      setLoading(false);
    });
  }, [participantId]);

  useEffect(() => {
    if (!participantId) return;
    loadData();
    return repository.subscribe(loadData);
  }, [participantId, loadData]);

  const today = todayIso();
  const todayLog = logs.find((l) => l.log_date === today);
  const last7 = logs.slice(-7);
  const isDelivered = Boolean(card);
  const carePlan = card?.aiDraft.care_plan ?? pendingDraft?.care_plan;

  // Today's actions: each supplement (taken toggle) + the daily mood check-in.
  const medCatalog = participant?.medications ?? [];
  const takenToday = (todayLog?.supplements ?? []).filter((s) => medCatalog.includes(s));
  const moodDone = Boolean(todayLog?.mood);
  const actionsTotal = medCatalog.length + 1; // +1 for the mood check-in
  const actionsDone = takenToday.length + (moodDone ? 1 : 0);

  async function patchToday(patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>) {
    if (!participantId) return;
    await upsertDailyLogAction(today, patch, participantId);
  }

  function toggleMed(name: string, taken: boolean) {
    const current = todayLog?.supplements ?? [];
    const next = taken ? [...current, name] : current.filter((s) => s !== name);
    patchToday({ supplements: next });
  }

  function setMoodScore(score: number) {
    patchToday({ mood: { score } });
  }

  const reviewPill = isDelivered
    ? { text: "Care-team reviewed", style: styles.pillReviewed, textStyle: styles.pillReviewedText }
    : carePlan
      ? { text: "AI draft · in review", style: styles.pillPending, textStyle: styles.pillPendingText }
      : null;

  if (loading) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  return (
    <MobileShell name={participant?.name}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeInView>
          <Text style={styles.title}>Care Plan</Text>
          <Text style={styles.subtitle}>Your care team&apos;s protocol, tracked one day at a time.</Text>

          <CarePlanTodayHero done={actionsDone} total={actionsTotal} dateLabel={todayLabel()} />

          <Text style={styles.sectionTitle}>Today&apos;s actions</Text>
          <TodayActionsList
            medications={medCatalog}
            takenToday={takenToday}
            moodScore={todayLog?.mood?.score ?? null}
            onToggleMed={toggleMed}
            onSetMood={setMoodScore}
            onManageMeds={() => router.push("/care-plan/medications")}
          />

          <View style={styles.planHeader}>
            <Text style={styles.sectionTitleFlush}>Your plan</Text>
            {reviewPill && (
              <View style={[styles.pill, reviewPill.style]}>
                <Text style={[styles.pillText, reviewPill.textStyle]}>{reviewPill.text}</Text>
              </View>
            )}
          </View>
          <View style={styles.categoriesList}>
            {CARE_PLAN_CATEGORIES.map(({ key, label, Icon, color, fallback, tracked }) => {
              const items = carePlan?.[key] ?? [];
              const planSnippet = items.length > 0 ? items[0] : fallback;
              const status = tracked ? todayStatus(key, todayLog, participant) : null;
              return (
                <CarePlanCategoryCard
                  key={key}
                  label={label}
                  Icon={Icon}
                  color={color}
                  planSnippet={planSnippet}
                  moreCount={Math.max(0, items.length - 1)}
                  status={status}
                  onPress={() => router.push(`/care-plan/${key}`)}
                />
              );
            })}
          </View>

          {last7.some((log) => log.mood) && (
            <>
              <Text style={styles.sectionTitle}>Mood this week</Text>
              <Card>
                <View style={styles.barsContainer}>
                  {last7.map((log) => {
                    const value = trendValue(log);
                    return (
                      <View key={log.log_date} style={styles.barColumn}>
                        <View style={styles.barTrack}>
                          {value !== null && (
                            <View
                              style={[
                                styles.barFill,
                                { height: Math.max(4, Math.round((value / 100) * TREND_BAR_TRACK_HEIGHT)) },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={styles.dayLabel}>{dayLabel(log.log_date)}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          )}

          <Text style={styles.sectionTitle}>Sharpen your plan</Text>
          <Card style={styles.addDataCard}>
            {ADD_DATA_ROWS.map(({ Icon, label, description, route }, i) => (
              <TouchableOpacity
                key={route}
                style={[styles.addDataRow, i > 0 && styles.addDataRowDivider]}
                onPress={() => uploadMoreData(route)}
                activeOpacity={0.7}
              >
                <View style={styles.addDataIcon}>
                  <Icon size={18} color={colors.sageDark} />
                </View>
                <View style={styles.addDataText}>
                  <Text style={styles.addDataLabel}>{label}</Text>
                  <Text style={styles.addDataDescription}>{description}</Text>
                </View>
                <ChevronRight size={18} color={colors.inkMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </FadeInView>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    fontWeight: "700",
    color: colors.charcoal,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  sectionTitleFlush: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.bodyLg,
    fontWeight: "700",
    color: colors.charcoal,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  pill: {
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  pillText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pillReviewed: { backgroundColor: colors.sageTint },
  pillReviewedText: { color: colors.sage },
  pillPending: { backgroundColor: colors.terracottaTint },
  pillPendingText: { color: colors.terracottaInk },
  categoriesList: { gap: spacing.md },
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
    height: TREND_BAR_TRACK_HEIGHT,
    width: "70%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.mental,
  },
  dayLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  addDataCard: { padding: 0 },
  addDataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  addDataRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addDataIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
  },
  addDataText: { flex: 1, gap: 2 },
  addDataLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  addDataDescription: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
});
