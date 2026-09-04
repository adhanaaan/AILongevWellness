import React from "react";
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

/**
 * Confirmation prompt for a consequential action.
 *
 * Exists because `Alert.alert` DOES NOT WORK on web -- react-native-web ships it
 * as `class Alert { static alert() {} }`, an empty function. Web is this app's
 * only deployment target and is also what runs inside the native shell's
 * WebView, so any flow gated behind `Alert.alert` silently never happens. Use
 * this instead; never reintroduce `Alert.alert` for anything the user must
 * confirm.
 *
 * Follows TermsModal's sheet presentation so the two read as one system.
 */
export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  /** Body copy. Say plainly what will happen, including anything retained. */
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm action in red. For irreversible actions only. */
  destructive?: boolean;
  /** Disables both actions while the work is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Tapping the backdrop cancels -- but not mid-action, where dismissing would
  // leave the user unsure whether the thing happened.
  const dismiss = busy ? () => {} : onCancel;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <ScrollView style={styles.body}>
            <Text style={styles.bodyText}>{message}</Text>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              size="lg"
              variant={destructive ? "danger" : "primary"}
              disabled={busy}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button size="lg" variant="secondary" disabled={busy} onPress={onCancel}>
              {cancelLabel}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,20,13,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    paddingTop: spacing["2xl"],
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    maxHeight: "75%",
    ...shadows.elevated,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  body: {
    maxHeight: 320,
  },
  bodyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 24,
  },
  actions: {
    marginTop: spacing["2xl"],
    gap: spacing.sm,
  },
});
