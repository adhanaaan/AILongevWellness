import React, { useState } from "react";
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
} from "lucide-react-native";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { colors, fontSizes, radii } from "@/lib/theme/tokens";

const WEEKLY_TREND = [62, 70, 58, 74, 80, 66, 72];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const MOODS = [
  { key: "great", label: "Great", Icon: Smile },
  { key: "okay", label: "Okay", Icon: Meh },
  { key: "low", label: "Low", Icon: Frown },
] as const;

const SUPPLEMENTS = ["Omega-3", "Vitamin D", "Magnesium"];

export default function TrackingPage() {
  const [mood, setMood] = useState<string>("okay");
  const [meals, setMeals] = useState(1);
  const [supplementsTaken, setSupplementsTaken] = useState<
    Record<string, boolean>
  >({});

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
            {WEEKLY_TREND.map((v, i) => (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { height: `${v}%` as any }]}
                  />
                </View>
                <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.grid}>
          <Card padding="sm" style={styles.gridHalf}>
            <Moon size={18} color={colors.sageDark} />
            <Text style={styles.statValue}>7.2h</Text>
            <Text style={styles.statLabel}>Sleep last night</Text>
          </Card>
          <Card padding="sm" style={styles.gridHalf}>
            <Activity size={18} color={colors.sageDark} />
            <Text style={styles.statValue}>6,410</Text>
            <Text style={styles.statLabel}>Steps today</Text>
          </Card>

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
            <Text style={styles.statValue}>{meals} logged</Text>
            <Button
              size="sm"
              shape="md"
              variant="secondary"
              onPress={() => setMeals((m) => m + 1)}
            >
              Add meal
            </Button>
          </Card>
          <Card padding="sm" style={styles.gridHalf}>
            <Scale size={18} color={colors.sageDark} />
            <Text style={styles.statValue}>82.0 kg</Text>
            <Text style={styles.statLabel}>This morning</Text>
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
                  checked={Boolean(supplementsTaken[s])}
                  onChange={(v) =>
                    setSupplementsTaken((prev) => ({ ...prev, [s]: v }))
                  }
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
    flex: 1,
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
