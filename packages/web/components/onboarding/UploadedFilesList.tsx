import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FileCheck2, Clock } from "lucide-react-native";
import { fileDisplayName } from "@/lib/onboarding/useChannelUpload";
import type { FileRecord } from "@/lib/types/db";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

/**
 * Shows the participant which files they've already uploaded to a capture
 * channel (with read/processing status), so an upload is visibly registered and
 * they can add more without wondering whether the first one went through.
 */
export function UploadedFilesList({ files }: { files: FileRecord[] }) {
  if (files.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {files.length === 1 ? "Uploaded file" : `Uploaded files · ${files.length}`}
      </Text>
      {files.map((f) => (
        <View key={f.id} style={styles.row}>
          {f.extracted ? (
            <FileCheck2 size={16} color={colors.success} />
          ) : (
            <Clock size={16} color={colors.inkMuted} />
          )}
          <Text style={styles.name} numberOfLines={1}>
            {fileDisplayName(f.storage_path)}
          </Text>
          <Text style={[styles.status, f.extracted && styles.statusDone]}>
            {f.extracted ? "Read" : "Processing"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.successTint,
  },
  heading: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.ink,
  },
  status: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
  statusDone: {
    color: colors.success,
  },
});
