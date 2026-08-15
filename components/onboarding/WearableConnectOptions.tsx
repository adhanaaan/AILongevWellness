import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, Linking, ActivityIndicator } from "react-native";
import { Watch, Smartphone, Copy, Check, ChevronRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isTerraEnabled, isSupabaseConfigured } from "@/lib/config/env";
import { terraConnect, setupHealthIngest } from "@/lib/ai/client";
import { colors, fontFamilies, fontSizes, radii, spacing } from "@/lib/theme/tokens";

function openExternal(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(url);
  } else {
    Linking.openURL(url);
  }
}

/**
 * The two API-driven ways to get device/health data in, shown above the manual
 * export upload on the Wearables capture screen:
 *   - Terra: OAuth-connect a wearable provider (Oura, Garmin, Fitbit, Whoop, ...).
 *   - Health Auto Export: a per-participant sync URL the iOS export app posts to.
 * Each option only renders when its backend is configured; if neither is, this
 * renders nothing and the screen falls back to the manual upload alone.
 */
export function WearableConnectOptions() {
  const { participantId, session } = useAuth();
  const [busy, setBusy] = useState<null | "terra" | "health">(null);
  const [error, setError] = useState<string | null>(null);
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isTerraEnabled && !isSupabaseConfigured) return null;

  async function connectTerra() {
    if (!participantId || !session?.access_token) return;
    setError(null);
    setBusy("terra");
    try {
      const redirect =
        Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : undefined;
      const { url } = await terraConnect(session.access_token, participantId, redirect, redirect);
      openExternal(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the connection. Please try again.");
      setBusy(null);
    }
  }

  async function getSyncLink() {
    if (!participantId || !session?.access_token) return;
    setError(null);
    setBusy("health");
    try {
      const { url } = await setupHealthIngest(session.access_token, participantId);
      setIngestUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your sync link. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!ingestUrl) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(ingestUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* fall back to the selectable text below */
    }
  }

  return (
    <View style={styles.wrap}>
      {isTerraEnabled && (
        <Card padding="lg" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Watch size={20} color={colors.tealDark} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Connect a wearable</Text>
              <Text style={styles.cardSubtitle}>
                Oura, Garmin, Fitbit, Whoop, Apple Watch and more — syncs automatically.
              </Text>
            </View>
          </View>
          <Button
            variant="secondary"
            iconRight={<ChevronRight size={16} color={colors.tealDark} />}
            onPress={connectTerra}
            disabled={busy !== null}
          >
            {busy === "terra" ? "Opening…" : "Connect a device"}
          </Button>
        </Card>
      )}

      {isSupabaseConfigured && (
        <Card padding="lg" style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Smartphone size={20} color={colors.tealDark} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Auto-sync from iPhone</Text>
              <Text style={styles.cardSubtitle}>
                Use the Health Auto Export app to send your Apple Health data on a schedule.
              </Text>
            </View>
          </View>

          {ingestUrl ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Your private sync URL</Text>
              <Text style={styles.linkUrl} selectable numberOfLines={2}>
                {ingestUrl}
              </Text>
              <Button
                variant="secondary"
                iconLeft={
                  copied ? (
                    <Check size={16} color={colors.success} />
                  ) : (
                    <Copy size={16} color={colors.tealDark} />
                  )
                }
                onPress={copyLink}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Text style={styles.linkHint}>
                In Health Auto Export, add a REST API automation, paste this as the URL, and set
                the format to JSON. Keep it private — anyone with this link can add data to your
                account.
              </Text>
            </View>
          ) : (
            <Button variant="secondary" onPress={getSyncLink} disabled={busy !== null}>
              {busy === "health" ? "Creating…" : "Get my sync link"}
            </Button>
          )}
        </Card>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or upload a file manually</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing["2xl"],
    gap: spacing.lg,
  },
  card: {
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.bodyMd,
    color: colors.ink,
  },
  cardSubtitle: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.labelMd,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 20,
  },
  linkBox: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.tealTint,
  },
  linkLabel: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.tealDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkUrl: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: fontSizes.caption,
    color: colors.ink,
  },
  linkHint: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  error: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.labelMd,
    color: colors.danger,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fontSizes.caption,
    color: colors.inkMuted,
  },
});
