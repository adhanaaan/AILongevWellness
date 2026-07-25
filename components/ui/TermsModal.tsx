import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

const SCROLL_END_THRESHOLD = 24;

export interface TermsModalProps {
  visible: boolean;
  title: string;
  body: string;
  onAccept: () => void;
  onClose: () => void;
}

export function TermsModal({ visible, title, body, onAccept, onClose }: TermsModalProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (scrolledToEnd) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const reachedEnd =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_END_THRESHOLD;
    if (reachedEnd) setScrolledToEnd(true);
  }

  // Short bodies that don't need scrolling at all still gate on "reached the
  // end" -- once both measurements are in, treat a non-scrollable body as
  // already fully read.
  useEffect(() => {
    if (containerHeight > 0 && contentHeight > 0 && contentHeight <= containerHeight) {
      setScrolledToEnd(true);
    }
  }, [containerHeight, contentHeight]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={8}>
              <X size={22} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, height) => setContentHeight(height)}
          >
            <Text style={styles.bodyText}>{body}</Text>
          </ScrollView>

          <View style={styles.footer}>
            {scrolledToEnd ? (
              <Button size="lg" onPress={onAccept}>
                Accept and continue
              </Button>
            ) : (
              <Button size="lg" variant="secondary" disabled>
                Scroll to bottom
              </Button>
            )}
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
    paddingTop: spacing.lg,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    maxHeight: "75%",
    ...shadows.elevated,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
    flexShrink: 1,
    marginRight: spacing.md,
  },
  body: {
    maxHeight: 360,
  },
  bodyText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 24,
    paddingBottom: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
