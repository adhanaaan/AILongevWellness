// ─── Primitive Scales ───

export const teal = {
  50: "#EAF7F6",
  100: "#D3EFED",
  200: "#A8DFDB",
  300: "#7DCFC8",
  400: "#52BFB5",
  500: "#2AAFAA",
  600: "#218F8B",
  700: "#1C7874",
  800: "#16605D",
  900: "#114A47",
} as const;

export const gray = {
  50: "#F7F8FA",
  100: "#EDEFF3",
  200: "#DDE1E7",
  300: "#C4CAD3",
  400: "#A3ABB8",
  500: "#8B95A5",
  600: "#6B7386",
  700: "#4F5668",
  800: "#333949",
  900: "#1A1F2B",
} as const;

// ─── Semantic Colors ───

export const colors = {
  // Surfaces
  cloud: "#F4F6F8",
  cloudLight: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceMuted: gray[100],

  // Navy (dark ground)
  navy: "#0A1628",
  navyMid: "#132038",
  navyLight: "#1C2D4A",

  // Primary — teal
  teal: teal[500],
  tealDark: "#1E8C88",
  tealTint: teal[50],

  // Accent — amber
  amber: "#D4A853",
  amberLight: "#E4C583",
  amberLighter: "#FBF4E4",
  amberDark: "#A8823A",

  // Text
  ink: gray[900],
  inkMuted: gray[500],
  inkOnDark: "#FFFFFF",
  inkOnDarkMuted: "rgba(255,255,255,0.6)",

  // Borders
  border: gray[200],
  borderStrong: gray[300],

  // Feedback
  success: "#34C759",
  successTint: "#E6F9EC",
  warning: "#E8924A",
  warningTint: "#FBE9D8",
  danger: "#E5484D",
  dangerTint: "#FBE4E2",
  info: "#3B82F6",
  infoTint: "#E6F0FF",

  // Pillar — vascular
  vascular: "#E5484D",
  vascularLight: "#EE8286",
  vascularLighter: "#FBD3D5",
  vascularDark: "#A8353A",

  // Pillar — metabolic
  metabolic: "#E8924A",
  metabolicLight: "#F0B27E",
  metabolicLighter: "#FBDFC4",
  metabolicDark: "#B8692F",

  // Pillar — mental
  mental: "#8B7CF6",
  mentalLight: "#B4AAFA",
  mentalLighter: "#E3DEFC",
  mentalDark: "#6152C4",

  white: "#FFFFFF",
  transparent: "transparent",

  // ─── Legacy aliases (keeps non-onboarding screens compiling) ───
  bone: "#F4F6F8",
  sage: teal[500],
  sageDark: "#1E8C88",
  sageTint: teal[50],
  charcoal: gray[900],
  terracotta: "#E8924A",
  terracottaInk: "#B8692F",
  terracottaTint: "#FBE9D8",
} as const;

// ─── Typography ───

export const fontFamilies = {
  display: "Lora_400Regular",
  displayMedium: "Lora_500Medium",
  displaySemiBold: "Lora_600SemiBold",
  displayBold: "Lora_700Bold",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;

export const fontSizes = {
  display: 48,
  headlineLg: 32,
  headlineMd: 24,
  headlineSm: 20,
  bodyLg: 18,
  bodyMd: 16,
  labelMd: 14,
  caption: 12,
  overline: 11,
} as const;

export const fontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

export const lineHeights = {
  display: 56,
  headlineLg: 40,
  headlineMd: 32,
  headlineSm: 28,
  bodyLg: 28,
  bodyMd: 24,
  labelMd: 20,
  caption: 16,
} as const;

// ─── Spacing ───

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
  "6xl": 64,
} as const;

// ─── Radii ───

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows ───

export const shadows = {
  soft: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  elevated: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;
