import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, type ImageSourcePropType } from "react-native";
import { SDMT_DURATION_SECONDS, SDMT_SYMBOL_COUNT, sdmtScore } from "@/lib/ai/symbolDigit";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

// Symbol-Digit Matching game (ported from recognaizelite "lite-two"). A key maps
// 10 symbols to the digits 0-9; one symbol is shown large; the participant taps
// its matching digit on the pad. Correct/incorrect both advance to the next
// symbol; score = correct - errors over 60 seconds. Faithful mechanics, rebuilt
// in React Native with the AI Wellness design system (the original is Next.js +
// Tailwind + framer-motion, which don't exist here).

const ICON_SOURCES: ImageSourcePropType[] = [
  require("../../assets/symbol-digit/sun.png"),
  require("../../assets/symbol-digit/camera.png"),
  require("../../assets/symbol-digit/flash.png"),
  require("../../assets/symbol-digit/lock.png"),
  require("../../assets/symbol-digit/moon.png"),
  require("../../assets/symbol-digit/next.png"),
  require("../../assets/symbol-digit/puzzle.png"),
  require("../../assets/symbol-digit/setting.png"),
  require("../../assets/symbol-digit/star.png"),
  require("../../assets/symbol-digit/mail.png"),
];

export interface SymbolDigitResult {
  correct: number;
  errors: number;
  score: number;
}

export interface SymbolDigitGameProps {
  onComplete: (result: SymbolDigitResult) => void;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "countdown" | "playing" | "done";

export function SymbolDigitGame({ onComplete }: SymbolDigitGameProps) {
  // keyMap[digit] = icon index. A fixed random permutation for the whole run —
  // this is the reference key the participant reads from.
  const keyMap = useMemo(() => shuffled([...Array(SDMT_SYMBOL_COUNT).keys()]), []);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [activeIcon, setActiveIcon] = useState(() => Math.floor(Math.random() * SDMT_SYMBOL_COUNT));
  const [timeLeft, setTimeLeft] = useState(SDMT_DURATION_SECONDS);
  const [flash, setFlash] = useState<"success" | "error" | null>(null);

  // Counters live in a ref so the 1s timer's completion handler reads final
  // values without stale-closure races; mirrored into state for display.
  const counts = useRef({ correct: 0, errors: 0 });
  const [display, setDisplay] = useState({ correct: 0, errors: 0 });
  const finished = useRef(false);

  // Countdown 3 -> 2 -> 1 -> go.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // 60-second game clock.
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          if (!finished.current) {
            finished.current = true;
            const { correct, errors } = counts.current;
            setPhase("done");
            onComplete({ correct, errors, score: sdmtScore(correct, errors) });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onComplete]);

  const nextIcon = useCallback((prev: number) => {
    let n = Math.floor(Math.random() * SDMT_SYMBOL_COUNT);
    if (n === prev) n = (n + 1) % SDMT_SYMBOL_COUNT;
    return n;
  }, []);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const onPressDigit = useCallback(
    (digit: number) => {
      if (phase !== "playing") return;
      const isCorrect = keyMap[digit] === activeIcon;
      if (isCorrect) counts.current.correct += 1;
      else counts.current.errors += 1;
      setDisplay({ ...counts.current });
      setFlash(isCorrect ? "success" : "error");
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 180);
      setActiveIcon((prev) => nextIcon(prev));
    },
    [phase, keyMap, activeIcon, nextIcon]
  );

  const score = Math.max(display.correct - display.errors, 0);

  if (phase === "countdown") {
    return (
      <View style={styles.countdownWrap}>
        <Text style={styles.countdownHint}>Get ready…</Text>
        <Text style={styles.countdownNumber}>{countdown > 0 ? countdown : "Go!"}</Text>
        <Text style={styles.countdownSub}>Match each symbol to its number as fast as you can.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* Header: score + time */}
      <View style={styles.statusRow}>
        <View style={styles.statusPill}>
          <Text style={styles.statusLabel}>Score</Text>
          <Text style={styles.statusValue}>{score}</Text>
        </View>
        <View style={[styles.statusPill, timeLeft <= 10 && styles.statusPillUrgent]}>
          <Text style={styles.statusLabel}>Time</Text>
          <Text style={[styles.statusValue, timeLeft <= 10 && styles.statusValueUrgent]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Reference key: digit + its symbol */}
      <View style={styles.keyGrid}>
        {keyMap.map((iconIdx, digit) => (
          <View key={digit} style={styles.keyCell}>
            <Text style={styles.keyDigit}>{digit}</Text>
            <Image source={ICON_SOURCES[iconIdx]} style={styles.keyIcon} resizeMode="contain" />
          </View>
        ))}
      </View>

      {/* The active symbol */}
      <View
        style={[
          styles.activeWrap,
          flash === "success" && styles.activeSuccess,
          flash === "error" && styles.activeError,
        ]}
      >
        <Image source={ICON_SOURCES[activeIcon]} style={styles.activeIcon} resizeMode="contain" />
      </View>

      {/* Number pad 0-9 */}
      <View style={styles.pad}>
        {[...Array(SDMT_SYMBOL_COUNT).keys()].map((digit) => (
          <Pressable
            key={digit}
            onPress={() => onPressDigit(digit)}
            style={({ pressed }) => [styles.padButton, pressed && styles.padButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Number ${digit}`}
          >
            <Text style={styles.padButtonText}>{digit}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "space-between", gap: spacing.md },
  countdownWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing["2xl"] },
  countdownHint: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.overline,
    color: colors.tealDark,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  countdownNumber: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 96,
    lineHeight: 104,
    color: colors.teal,
  },
  countdownSub: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  statusRow: { flexDirection: "row", gap: spacing.md },
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.tealTint,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statusPillUrgent: { backgroundColor: colors.amberLighter },
  statusLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusValue: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.tealDark,
  },
  statusValueUrgent: { color: colors.amberDark },
  keyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  keyCell: {
    width: "18%",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  keyDigit: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  keyIcon: { width: 26, height: 26, marginTop: 2 },
  activeWrap: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  activeSuccess: { borderColor: colors.success, backgroundColor: colors.successTint },
  activeError: { borderColor: colors.danger, backgroundColor: colors.amberLighter },
  activeIcon: { width: 76, height: 76 },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  padButton: {
    width: "30%",
    aspectRatio: 1.9,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  padButtonPressed: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  padButtonText: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
  },
});
