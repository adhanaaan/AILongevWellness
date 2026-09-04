import { useCallback, useEffect, useState } from "react";

import { canScheduleReminders, cancelDailyReminder, scheduleDailyReminder } from ".";

/**
 * The daily check-in reminder.
 *
 * Only available inside the native shell -- a browser cannot wake the app at a
 * chosen time. It is also the shell's clearest justification for existing at
 * all under App Store guideline 4.2, which rejects apps that are just a website
 * in a wrapper. That only holds if it is genuinely user-configurable and easy
 * for a reviewer to find, so it lives in Settings rather than running silently.
 */

const STORAGE_KEY = "aiw.reminder";

/** Offered times, tapped through in order. Evening default: the check-in reflects on the day. */
export const REMINDER_TIMES = [
  { hour: 8, minute: 0, label: "8:00 AM" },
  { hour: 12, minute: 0, label: "12:00 PM" },
  { hour: 18, minute: 0, label: "6:00 PM" },
  { hour: 20, minute: 0, label: "8:00 PM" },
] as const;

const DEFAULT_TIME_INDEX = 3;

const TITLE = "Time for your check-in";
const BODY = "Take a moment to log how you're feeling today.";

interface StoredPreference {
  enabled: boolean;
  timeIndex: number;
}

function readPreference(): StoredPreference | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPreference>;
    if (typeof parsed?.enabled !== "boolean") return null;
    const timeIndex =
      typeof parsed.timeIndex === "number" && REMINDER_TIMES[parsed.timeIndex] !== undefined
        ? parsed.timeIndex
        : DEFAULT_TIME_INDEX;
    return { enabled: parsed.enabled, timeIndex };
  } catch {
    // Private mode, evicted storage, or a shape from an older build.
    return null;
  }
}

function writePreference(preference: StoredPreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Preference won't survive a relaunch. The reminder itself is scheduled with
    // the OS regardless, so this only affects what the toggle shows.
  }
}

export interface DailyReminder {
  /** False in a browser — the whole section should be hidden. */
  available: boolean;
  enabled: boolean;
  timeIndex: number;
  timeLabel: string;
  /** True after the user turned it on but the OS denied permission. */
  permissionDenied: boolean;
  setEnabled: (next: boolean) => void;
  cycleTime: () => void;
}

export function useDailyReminder(): DailyReminder {
  const available = canScheduleReminders();
  const [enabled, setEnabledState] = useState(false);
  const [timeIndex, setTimeIndex] = useState(DEFAULT_TIME_INDEX);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Reconcile the OS with the stored preference on mount. Scheduling is
  // idempotent (the shell cancels before scheduling), and cancelling when
  // disabled matters because localStorage can be evicted in a WKWebView --
  // leaving a reminder firing that the UI would show as off.
  useEffect(() => {
    if (!available) return;

    const stored = readPreference();
    if (!stored) {
      void cancelDailyReminder();
      return;
    }

    setEnabledState(stored.enabled);
    setTimeIndex(stored.timeIndex);

    if (!stored.enabled) {
      void cancelDailyReminder();
      return;
    }

    const time = REMINDER_TIMES[stored.timeIndex];
    void scheduleDailyReminder({ ...time, title: TITLE, body: BODY }).then((scheduled) => {
      // Permission was revoked in system settings since last launch.
      if (!scheduled) {
        setEnabledState(false);
        writePreference({ enabled: false, timeIndex: stored.timeIndex });
      }
    });
  }, [available]);

  const apply = useCallback(async (nextEnabled: boolean, nextTimeIndex: number) => {
    if (!nextEnabled) {
      writePreference({ enabled: false, timeIndex: nextTimeIndex });
      await cancelDailyReminder();
      return;
    }

    const time = REMINDER_TIMES[nextTimeIndex];
    const scheduled = await scheduleDailyReminder({ ...time, title: TITLE, body: BODY });

    // Don't leave the switch showing "on" when the OS said no -- the user would
    // wait for a reminder that is never coming.
    setEnabledState(scheduled);
    setPermissionDenied(!scheduled);
    writePreference({ enabled: scheduled, timeIndex: nextTimeIndex });
  }, []);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      setPermissionDenied(false);
      void apply(next, timeIndex);
    },
    [apply, timeIndex]
  );

  const cycleTime = useCallback(() => {
    const next = (timeIndex + 1) % REMINDER_TIMES.length;
    setTimeIndex(next);
    void apply(enabled, next);
  }, [apply, enabled, timeIndex]);

  return {
    available,
    enabled,
    timeIndex,
    timeLabel: REMINDER_TIMES[timeIndex].label,
    permissionDenied,
    setEnabled,
    cycleTime,
  };
}
