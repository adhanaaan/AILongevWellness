import { Platform } from "react-native";

export type HapticStyle = "light" | "medium" | "selection" | "success";

/**
 * Fires a subtle haptic on a meaningful tap. NO-OP on web (haptics are a native
 * capability) and NO-OP if `expo-haptics` isn't installed — so this is safe to
 * call from anywhere without a hard dependency. The module id is held in a
 * variable so the bundler never statically pulls in an optional native module;
 * on native, if the package is present it fires, otherwise the require throws
 * and is swallowed.
 */
export function haptic(style: HapticStyle = "light"): void {
  if (Platform.OS === "web") return;
  try {
    const moduleName = "expo-haptics";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require(moduleName) as {
      selectionAsync?: () => void;
      impactAsync?: (s?: unknown) => void;
      notificationAsync?: (t?: unknown) => void;
      ImpactFeedbackStyle?: { Light?: unknown; Medium?: unknown };
      NotificationFeedbackType?: { Success?: unknown };
    };
    switch (style) {
      case "selection":
        Haptics.selectionAsync?.();
        break;
      case "medium":
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium);
        break;
      case "success":
        Haptics.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);
        break;
      default:
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light);
    }
  } catch {
    // expo-haptics unavailable — silent no-op.
  }
}
