import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors, fontSizes, fontWeights } from "@/lib/theme/tokens";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  src?: string;
  initials: string;
  size?: AvatarSize;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: fontSizes.caption,
  md: fontSizes.labelMd,
  lg: fontSizes.bodyLg,
};

export function Avatar({ src, initials, size = "md" }: AvatarProps) {
  const dimension = sizeMap[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
      ]}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: fontSizeMap[size] }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.sageTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    resizeMode: "cover",
  },
  initials: {
    color: colors.sageDark,
    fontWeight: fontWeights.semibold,
  },
});
