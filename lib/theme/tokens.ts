export const colors = {
  bone: "#FAF9F4",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F1EA",
  charcoal: "#1A1C1C",
  inkMuted: "#5F625C",

  sage: "#6B9080",
  sageDark: "#557567",
  sageTint: "#E8F0EB",

  terracotta: "#E98A6D",
  terracottaInk: "#B8542F",
  terracottaTint: "#FBE9E1",

  border: "#DCD9CF",
  borderStrong: "#C9C5B8",

  danger: "#BA1A1A",
  dangerTint: "#FBE4E2",

  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const fontSizes = {
  display: 48,
  headlineLg: 32,
  headlineMd: 24,
  bodyLg: 18,
  bodyMd: 16,
  labelMd: 14,
  caption: 12,
} as const;

export const fontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const shadows = {
  soft: {
    shadowColor: "#1A1C1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  card: {
    shadowColor: "#1A1C1C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;
