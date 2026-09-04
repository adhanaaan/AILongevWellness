import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { GradientOverlay, type GradientStop } from "@/components/ui/GradientOverlay";
import { colors } from "@/lib/theme/tokens";

export interface VideoHeroProps {
  source: VideoSource;
  /** Rendered behind the video/overlay when source is null, e.g. GradientOrb glow. */
  fallback?: React.ReactNode;
  overlayStops?: GradientStop[];
  style?: ViewStyle;
  children?: React.ReactNode;
}

const DEFAULT_OVERLAY_STOPS: GradientStop[] = [
  { offset: "0", color: "rgba(10,22,40,0.75)" },
  { offset: "0.35", color: "rgba(10,22,40,0.35)" },
  { offset: "0.7", color: "rgba(10,22,40,0.55)" },
  { offset: "1", color: "rgba(10,22,40,0.92)" },
];

export function VideoHero({
  source,
  fallback,
  overlayStops = DEFAULT_OVERLAY_STOPS,
  style,
  children,
}: VideoHeroProps) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    if (source) p.play();
  });

  return (
    <View style={[styles.container, style]}>
      {source ? (
        <VideoView
          style={styles.fill}
          player={player}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      ) : (
        <View style={styles.fill}>{fallback}</View>
      )}
      <GradientOverlay stops={overlayStops} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
});
