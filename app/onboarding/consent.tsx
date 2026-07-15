import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { colors, fontSizes, radii, shadows } from "@/lib/theme/tokens";

const ITEMS = [
  {
    key: "wellness",
    text: "I understand this is a wellness programme, not a medical diagnosis.",
  },
  {
    key: "reviewed",
    text: "I consent to my data being reviewed by the care team (GP and TCM practitioner).",
  },
  {
    key: "privacy",
    text: "I have read and agree to the privacy terms.",
  },
];

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = ITEMS.every((item) => checked[item.key]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Consent & wellness disclaimer</Text>
        <Text style={styles.subtitle}>
          Before we begin, please confirm the following.
        </Text>

        <View style={styles.items}>
          {ITEMS.map((item) => {
            const isChecked = Boolean(checked[item.key]);
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.item}
                onPress={() =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key],
                  }))
                }
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && <Check size={14} color={colors.white} />}
                </View>
                <Text style={styles.itemText}>{item.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          size="lg"
          disabled={!allChecked}
          onPress={() => router.push("/onboarding/profile")}
        >
          Agree and continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bone,
    maxWidth: 448,
    alignSelf: "center",
    width: "100%",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: fontSizes.headlineLg,
    fontWeight: "600",
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: 8,
  },
  items: {
    marginTop: 32,
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.card,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  itemText: {
    flex: 1,
    fontSize: fontSizes.bodyMd,
    color: colors.charcoal,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
