import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { METHODOLOGY_SECTIONS } from "@/lib/methodology/content";
import { colors, fontFamilies, fontSizes, fontWeights, spacing } from "@/lib/theme/tokens";

export default function MethodologyPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={16} color={colors.inkMuted} />}
          onPress={() => router.back()}
        >
          Back
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Methodology & Sources</Text>
        <Text style={styles.subtitle}>
          How your scores are calculated, and where the reference ranges behind them come from.
        </Text>

        {METHODOLOGY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((p, i) => (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  title: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: fontSizes.headlineLg,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  section: {
    marginTop: spacing["2xl"],
  },
  sectionTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.labelMd,
    fontWeight: fontWeights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.bodyMd,
    color: colors.inkMuted,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
});
