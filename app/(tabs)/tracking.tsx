import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Smartphone, PersonStanding, FileText, ChevronRight, RotateCw, type LucideIcon } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { FadeInView } from "@/components/ui/FadeInView";
import { WellnessDisclaimer } from "@/components/participant/WellnessDisclaimer";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";
import { listDailyLogsAction, upsertDailyLogAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CARE_PLAN_CATEGORIES, normalizePlanItem } from "@/lib/carePlan/categories";
import { CarePlanCategoryCard, type CarePlanTodayStatus } from "@/components/participant/CarePlanCategoryCard";
import { CarePlanTodayHero } from "@/components/participant/CarePlanTodayHero";
import { CarePlanSectionLabel } from "@/components/participant/CarePlanSectionLabel";
import { TodayActionsList } from "@/components/participant/TodayActionsList";
import { DraftStatusBadge } from "@/components/participant/DraftStatusBadge";
import { GeneratePlanCard } from "@/components/participant/GeneratePlanCard";
import { useGenerateDraft } from "@/lib/ai/useGenerateDraft";
import { isSupabaseConfigured } from "@/lib/config/env";
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
    Icon: Smartphone,
    label: "Phone health data",
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
  const { status: genStatus, error: genError, generate } = useGenerateDraft(participantId);

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

  // Server-side generation writes the draft directly to Supabase, which the
  // local repository.subscribe won't observe — so reload on success to pick it up.
  // A signed/delivered card is locked from full regeneration, so there we backfill
  // only the missing care plan ("carePlan" mode) rather than redoing the draft.
  async function handleGenerate() {
    const ok = await generate(card ? "carePlan" : "draft");
    if (ok) loadData();
  }

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
  // The care plan is AI-drafted then clinician-reviewed on the same pipeline as
  // the scores, so it carries the same status badge as the Insights snapshot:
  // "AI-drafted · pending review" until sign-off, then "Reviewed & signed off by".
  const reviews = card?.reviews ?? [];
  const gp = reviews.find((r) => r.stage === "gp");
  const tcm = reviews.find((r) => r.stage === "tcm");
  // A delivered card can have a care plan that was AI-backfilled AFTER sign-off
  // (a plan added to a card that was signed before it had one). Such a plan
  // hasn't been reviewed, so it must read "pending review," never "signed off."
  // Sign-off never writes ai_draft, so generated_at only moves past the review
  // time when the plan was (re)generated afterwards — that's the signal. Only
  // possible in Supabase mode, where the backfill runs.
  const latestSignedAt = reviews.reduce(
    (max, r) => (r.signed_at ? Math.max(max, Date.parse(r.signed_at)) : max),
    0
  );
  const draftGeneratedAt = card?.aiDraft.generated_at ? Date.parse(card.aiDraft.generated_at) : 0;
  const carePlanPendingReview =
    isSupabaseConfigured && isDelivered && !!carePlan && draftGeneratedAt > latestSignedAt;

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
          {/* Only badge the plan's review status when there's an actual plan to
              attribute it to. A plan backfilled onto a delivered card after
              sign-off hasn't been reviewed, so it reads "AI-drafted · pending
              review" (isDelivered=false), not "signed off". */}
          {carePlan && (
            <DraftStatusBadge isDelivered={isDelivered && !carePlanPendingReview} gp={gp} tcm={tcm} />
          )}

          {/* A pending (un-reviewed) backfilled plan can be regenerated — e.g. to
              refresh it after a prompt/format improvement. */}
          {carePlanPendingReview && (
            <View style={styles.regenRow}>
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={genStatus === "generating"}
                style={styles.regenBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <RotateCw size={13} color={colors.sageDark} />
                <Text style={styles.regenText}>
                  {genStatus === "generating" ? "Regenerating…" : "Regenerate plan"}
                </Text>
              </TouchableOpacity>
              {genStatus === "error" && <Text style={styles.regenError}>{genError}</Text>}
            </View>
          )}

          {/* Offer generation whenever there's no plan. On a delivered card this
              backfills only the care plan (handleGenerate picks the mode). */}
          {!carePlan && isSupabaseConfigured && (
            <GeneratePlanCard status={genStatus} error={genError} onGenerate={handleGenerate} />
          )}

          <CarePlanTodayHero done={actionsDone} total={actionsTotal} dateLabel={todayLabel()} />

          <CarePlanSectionLabel>Today&apos;s actions</CarePlanSectionLabel>
          <TodayActionsList
            medications={medCatalog}
            takenToday={takenToday}
            moodScore={todayLog?.mood?.score ?? null}
            onToggleMed={toggleMed}
            onSetMood={setMoodScore}
            onManageMeds={() => router.push("/care-plan/medications")}
          />

          <CarePlanSectionLabel>Your plan</CarePlanSectionLabel>
          {!carePlan && (
            <Text style={styles.starterNote}>
              {isDelivered
                ? "Your reviewed card didn't include a plan — generate one from your results above."
                : "Starter guidance to begin with — generate your personalized plan above."}
            </Text>
          )}
          <View style={styles.categoriesList}>
            {CARE_PLAN_CATEGORIES.map(({ key, label, Icon, color, starter, tracked }) => {
              const draftItems = carePlan?.[key];
              const items = (draftItems && draftItems.length > 0 ? draftItems : starter).map(
                normalizePlanItem
              );
              const status = tracked ? todayStatus(key, todayLog, participant) : null;
              return (
                <CarePlanCategoryCard
                  key={key}
                  label={label}
                  Icon={Icon}
                  color={color}
                  previewItems={items.slice(0, 2)}
                  moreCount={Math.max(0, items.length - 2)}
                  status={status}
                  onPress={() => router.push(`/care-plan/${key}`)}
                />
              );
            })}
          </View>

          {last7.some((log) => log.mood) && (
            <>
              <CarePlanSectionLabel>Mood this week</CarePlanSectionLabel>
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

          <CarePlanSectionLabel>Sharpen your plan</CarePlanSectionLabel>
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
          <WellnessDisclaimer />
        </FadeInView>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    color: colors.charcoal,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 4,
  },
  starterNote: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  regenRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
  },
  regenText: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.sageDark,
  },
  regenError: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.overline,
    color: colors.terracottaInk,
    lineHeight: 15,
  },
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
