import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Local daily reminders.
 *
 * Deliberately LOCAL, not push: no server, no device tokens, no FCM/APNs
 * credentials. The app's reminder need ("check in today") is entirely
 * time-based, so a scheduled local notification is the whole feature rather
 * than a stepping stone. Push can be added later without changing this contract.
 *
 * This is also the shell's main answer to App Store guideline 4.2, which rejects
 * apps that are just a website in a wrapper -- so the web app must surface it as
 * a visible, user-configurable setting, not a silent background scheduler.
 */

const CHANNEL_ID = "reminders";
/** One reminder at a time; rescheduling replaces rather than stacks. */
const IDENTIFIER = "aiw.daily-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  // Android 8+ drops notifications posted to a channel that doesn't exist, and
  // it must exist before the notification is scheduled, not when it fires.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
}

export async function requestPermission(): Promise<{ granted: boolean }> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return { granted: true };

  // canAskAgain is false once the user has denied at the OS level; asking again
  // is a silent no-op, so report the real answer instead of pretending to ask.
  if (!existing.canAskAgain) return { granted: false };

  const requested = await Notifications.requestPermissionsAsync();
  return { granted: requested.granted };
}

export async function scheduleDaily(params: {
  hour: number;
  minute: number;
  title: string;
  body: string;
}): Promise<{ scheduled: boolean }> {
  const { granted } = await requestPermission();
  if (!granted) return { scheduled: false };

  await ensureAndroidChannel();
  // Cancel first: scheduling the same identifier twice would otherwise leave the
  // user with duplicate daily reminders.
  await cancelDaily();

  await Notifications.scheduleNotificationAsync({
    identifier: IDENTIFIER,
    content: { title: params.title, body: params.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: params.hour,
      minute: params.minute,
      channelId: CHANNEL_ID,
    },
  });

  return { scheduled: true };
}

export async function cancelDaily(): Promise<{ ok: true }> {
  await Notifications.cancelScheduledNotificationAsync(IDENTIFIER).catch(() => {
    // Nothing scheduled under that identifier -- the desired end state anyway.
  });
  return { ok: true };
}
