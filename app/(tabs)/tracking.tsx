import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import {
  Moon,
  Activity,
  Utensils,
  Scale,
  ClipboardList,
  Smile,
  Meh,
  Frown,
  Minus,
  Plus,
} from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";
import {
  listDailyLogsAction,
  upsertDailyLogAction,
  DEMO_PARTICIPANT_ID,
} from "@/lib/data/actions";
import { repository } from "@/lib/data/mock";
import type { DailyLog } from "@/lib/types/db";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MOODS = [
  { key: "great", label: "Great", Icon: Smile, score: 9 },
  { key: "okay", label: "Okay", Icon: Meh, score: 6 },
  { key: "low", label: "Low", Icon: Frown, score: 3 },
] as const;

const SUPPLEMENTS = ["Omega-3", "Vitamin D", "Magnesium"];

// Fixed pixel height for the trend bar track: percentage heights on a flex-column
// child don't reliably resolve on react-native-web, so bar fill is computed in px.
const TREND_BAR_TRACK_HEIGHT = 44;

const SLEEP_PRESETS = [6, 6.5, 7, 7.5, 8, 8.5, 9];
const ACTIVITY_PRESETS: Array<{ type: string; duration_minutes: number }> = [
  { type: "Rest", duration_minutes: 0 },
  { type: "Walk", duration_minutes: 20 },
  { type: "Run", duration_minutes: 35 },
  { type: "Gym", duration_minutes: 45 },
  { type: "Yoga", duration_minutes: 25 },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sleepQualityFromHours(hours: number): number {
  return Math.max(0, Math.min(100, Math.round(((hours - 5) / 4) * 100)));
}

function moodKeyForScore(score: number): (typeof MOODS)[number]["key"] {
  return MOODS.slice().sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0].key;
}

function trendValue(log: DailyLog | undefined): number {
  const sleepQuality = log?.sleep?.quality ?? 70;
  const moodScore = log?.mood?.score ?? 5;
  return Math.round((sleepQuality + moodScore * 10) / 2);
}

function dayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T00:00:00`).getDay(); // 0 = Sunday
  return DAYS[(weekday + 6) % 7]; // rotate so Monday is index 0, matching DAYS
}

export default function TrackingPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(() => {
    listDailyLogsAction(DEMO_PARTICIPANT_ID).then((l) => {
      setLogs(l);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadLogs();
    return repository.subscribe(loadLogs);
  }, [loadLogs]);

  const today = todayIso();
  const todayLog = logs.find((l) => l.log_date === today);
  const last7 = logs.slice(-7);

  async function patchToday(patch: Partial<Omit<DailyLog, "id" | "participant_id" | "log_date">>) {
    const updated = await upsertDailyLogAction(today, patch);
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.log_date === today);
      if (idx === -1) return [...prev, updated];
      const next = prev.slice();
      next[idx] = updated;
      return next;
    });
  }

  function cycleSleep() {
    const current = todayLog?.sleep?.hours ?? 7;
    const currentIdx = SLEEP_PRESETS.findIndex((h) => h === current);
    const nextHours = SLEEP_PRESETS[(currentIdx + 1 + SLEEP_PRESETS.length) % SLEEP_PRESETS.length];
    patchToday({ sleep: { hours: nextHours, quality: sleepQualityFromHours(nextHours) } });
  }

  function cycleActivity() {
    const current = todayLog?.activity;
    const currentIdx = ACTIVITY_PRESETS.findIndex((a) => a.type === current?.type);
    const next = ACTIVITY_PRESETS[(currentIdx + 1 + ACTIVITY_PRESETS.length) % ACTIVITY_PRESETS.length];
    patchToday({ activity: next });
  }

  function setMood(key: (typeof MOODS)[number]["key"]) {
    const mood = MOODS.find((m) => m.key === key)!;
    patchToday({ mood: { score: mood.score } });
  }

  function addMeal() {
    const meals = (todayLog?.food?.meals ?? 0) + 1;
    patchToday({ food: { ...todayLog?.food, meals } });
  }

  function adjustWeight(delta: number) {
    const current = todayLog?.weight_kg ?? 82;
    patchToday({ weight_kg: Math.round((current + delta) * 10) / 10 });
  }

  function toggleSupplement(name: string, taken: boolean) {
    const current = todayLog?.supplements ?? [];
    const next = taken ? [...current, name] : current.filter((s) => s !== name);
    patchToday({ supplements: next });
  }

  const mood = todayLog?.mood ? moodKeyForScore(todayLog.mood.score) : "okay";

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
        <Text style={styles.title}>Daily tracking</Text>
        <Text style={styles.subtitle}>
          A quick log — wearable data syncs automatically.
        </Text>

        <Card style={styles.section}>
          <Text style={styles.cardLabel}>This week</Text>
          <View style={styles.barsContainer}>
            {last7.map((log) => (
              <View key={log.log_date} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: Math.max(4, Math.round((trendValue(log) / 100) * TREND_BAR_TRACK_HEIGHT)) },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{dayLabel(log.log_date)}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridHalf} onPress={cycleSleep} activeOpacity={0.7}>
            <Card padding="sm">
              <Moon size={18} color={colors.sageDark} />
              <Text style={styles.statValue}>
                {todayLog?.sleep ? `${todayLog.sleep.hours}h` : "Tap to log"}
              </Text>
              <Text style={styles.statLabel}>
                {todayLog?.sleep ? `Quality ${todayLog.sleep.quality}/100` : "Sleep last night"}
              </Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridHalf} onPress={cycleActivity} activeOpacity={0.7}>
            <Card padding="sm">
              <Activity size={18} color={colors.sageDark} />
              <Text style={styles.statValue}>{todayLog?.activity?.type ?? "Tap to log"}</Text>
              <Text style={styles.statLabel}>
                {todayLog?.activity ? `${todayLog.activity.duration_minutes} min` : "Activity today"}
              </Text>
            </Card>
          </TouchableOpacity>

          <Card padding="sm" style={styles.gridFull}>
            <View style={styles.moodHeader}>
              <Smile size={18} color={colors.sageDark} />
              <Text style={styles.cardLabel}>Mood</Text>
            </View>
            <View style={styles.moodRow}>
              {MOODS.map(({ key, label, Icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.moodOption,
                    mood === key && styles.moodOptionActive,
                  ]}
                  onPress={() => setMood(key)}
                >
                  <Icon
                    size={18}
                    color={mood === key ? colors.sageDark : colors.inkMuted}
                  />
                  <Text
                    style={[
                      styles.moodLabel,
                      mood === key && styles.moodLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card padding="sm" style={styles.gridHalf}>
            <Utensils size={18} color={colors.sageDark} />
            <Text style={styles.statValue}>{todayLog?.food?.meals ?? 0} logged</Text>
            <Button size="sm" shape="md" variant="secondary" onPress={addMeal}>
              Add meal
            </Button>
          </Card>

          <Card padding="sm" style={styles.gridHalf}>
            <Scale size={18} color={colors.sageDark} />
            <Text style={styles.statValue}>
              {todayLog?.weight_kg != null ? `${todayLog.weight_kg.toFixed(1)} kg` : "No data yet"}
            </Text>
            <View style={styles.weightRow}>
              <TouchableOpacity style={styles.weightButton} onPress={() => adjustWeight(-0.1)}>
                <Minus size={14} color={colors.sageDark} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.weightButton} onPress={() => adjustWeight(0.1)}>
                <Plus size={14} color={colors.sageDark} />
              </TouchableOpacity>
            </View>
          </Card>

          <Card padding="sm" style={styles.gridFull}>
            <View style={styles.moodHeader}>
              <ClipboardList size={18} color={colors.sageDark} />
              <Text style={styles.cardLabel}>Supplements</Text>
            </View>
            {SUPPLEMENTS.map((s) => (
              <View key={s} style={styles.suppRow}>
                <Text style={styles.suppName}>{s}</Text>
                <Toggle
                  checked={(todayLog?.supplements ?? []).includes(s)}
                  onChange={(v) => toggleSupplement(s, v)}
                  label={s}
                />
              </View>
            ))}
          </Card>
        </View>

        <Text style={styles.hint}>
          Wearable data syncs automatically — no need to log steps or sleep
          manually.
        </Text>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
  },
  gridHalf: {
    width: "47%",
    flexGrow: 1,
    gap: 4,
  },
  gridFull: {
    width: "100%",
    gap: 8,
  },
  statValue: {
    fontSize: fontSizes.headlineMd,
    fontWeight: "600",
    color: colors.charcoal,
  },
  statLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moodRow: {
    flexDirection: "row",
    gap: 8,
  },
  moodOption: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 8,
  },
  moodOptionActive: {
    borderColor: colors.sage,
    backgroundColor: colors.sageTint,
  },
  moodLabel: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  moodLabelActive: {
    color: colors.sageDark,
  },
  weightRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  weightButton: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  suppRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suppName: {
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
  },
  hint: {
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    marginTop: 24,
  },
});
