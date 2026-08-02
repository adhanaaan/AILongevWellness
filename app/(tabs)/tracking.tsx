import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Watch, PersonStanding, FileText, ChevronRight, type LucideIcon } from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { colors, fontSizes, radii, spacing } from "@/lib/theme/tokens";
import { listDailyLogsAction } from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CARE_PLAN_CATEGORIES } from "@/lib/carePlan/categories";
import type { DailyLog, Participant, PlanCategory } from "@/lib/types/db";
import type { SignedCard } from "@/lib/data/repository";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

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

function trendValue(log: DailyLog | undefined): number | null {
  if (!log?.mood) return null;
  return log.mood.score * 10;
}

function dayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday
  return DAYS[(weekday + 6) % 7]; // rotate so Monday is index 0, matching DAYS
}

/** Only medications and mindfulness have a daily self-report — see CarePlanCategoryConfig.tracked. */
function todayStatus(category: PlanCategory, todayLog: DailyLog | undefined, participant: Participant | null): string | null {
  switch (category) {
    case "medications": {
      const catalog = participant?.medications ?? [];
      if (catalog.length === 0) return "Add what you take";
      const taken = (todayLog?.supplements ?? []).length;
      return `${taken}/${catalog.length} taken today`;
    }
    case "mindfulness":
      return todayLog?.mood ? moodLabel(todayLog.mood.score) : "Not checked in yet";
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
    ]).then(([l, p, c]) => {
      setLogs(l);
      setParticipant(p);
      setCard(c);
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
  const carePlan = card?.aiDraft.care_plan;

  if (loading) {
    return (
      <MobileShell>
        <View style={styles.center}>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Care Plan</Text>
        <Text style={styles.subtitle}>
          {card
            ? "Verified by your care team — tap a category for the full plan."
            : "Your personalized plan appears here once your care team has reviewed your results."}
        </Text>

        {last7.some((log) => log.mood) && (
          <Card style={styles.section}>
            <Text style={styles.cardLabel}>Mood this week</Text>
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
        )}

        <Card style={styles.categoriesCard}>
          {CARE_PLAN_CATEGORIES.map(({ key, label, Icon, color, fallback, tracked }, i) => {
            const items = carePlan?.[key] ?? [];
            const planSnippet = items.length > 0 ? items[0] : fallback;
            const status = tracked ? todayStatus(key, todayLog, participant) : null;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.categoryRow, i > 0 && styles.categoryRowDivider]}
                onPress={() => router.push(`/care-plan/${key}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${color}1A` }]}>
                  <Icon size={18} color={color} />
                </View>
                <View style={styles.categoryText}>
                  <View style={styles.categoryHeaderRow}>
                    <Text style={styles.categoryLabel}>{label}</Text>
                    {items.length > 1 && (
                      <Text style={styles.categoryMoreCount}>+{items.length - 1} more</Text>
                    )}
                  </View>
                  <Text style={styles.categoryPlan} numberOfLines={2}>
                    {planSnippet}
                  </Text>
                  {status && <Text style={styles.categoryStatus}>{status}</Text>}
                </View>
                <ChevronRight size={18} color={colors.inkMuted} />
              </TouchableOpacity>
            );
          })}
        </Card>

        <Text style={styles.sectionTitle}>Add more data</Text>
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
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 32 },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 4,
  },
  section: { marginTop: 24 },
  cardLabel: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 8,
    marginTop: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barTrack: {
    height: TREND_BAR_TRACK_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.sage,
    opacity: 0.85,
  },
  dayLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  categoriesCard: { marginTop: 24, padding: 0 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  categoryRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { flex: 1, gap: 2 },
  categoryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryLabel: {
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  categoryMoreCount: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  categoryPlan: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  categoryStatus: {
    fontSize: fontSizes.caption,
    color: colors.sageDark,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: fontSizes.labelMd,
    fontWeight: "600",
    color: colors.charcoal,
    marginTop: 24,
    marginBottom: 8,
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
    fontSize: fontSizes.bodyMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  addDataDescription: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
});
