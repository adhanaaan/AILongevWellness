import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { colors, fontFamilies, fontSizes, radii, shadows, spacing } from "@/lib/theme/tokens";

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectFieldOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

export function SelectField({
  label,
  value,
  options,
  placeholder = "Select",
  onChange,
  style,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={selected ? styles.value : styles.placeholder} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.inkMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={isSelected ? styles.optionTextSelected : styles.optionText}>
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} color={colors.teal} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // No default flex sizing here: "flex: 1" sets flex-basis to 0% on web,
    // which collapses the wrapper's height to 0 when it's a column child
    // (as it is standalone in a card). Callers that need equal-width
    // columns in a row (e.g. Age / Height / Weight) pass flexGrow via style.
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    borderStyle: "dashed",
  },
  value: {
    flexShrink: 1,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  placeholder: {
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
  },
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
    paddingBottom: spacing["4xl"],
    maxHeight: "60%",
    ...shadows.elevated,
  },
  sheetTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fontSizes.headlineSm,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  optionTextSelected: {
    fontFamily: fontFamilies.bodySemiBold,
    color: colors.tealDark,
  },
});
