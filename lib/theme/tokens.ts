// ─── Primitive Scales ───

// AI Wellness brand green (from the logo's "Wellness" wordmark) — replaces the
// old Stitch-era teal. 500 is deliberately dark: it's the primary CTA fill.
export const teal = {
  50: "#EEF4EE",
  100: "#DBE9DC",
  200: "#B7D3B8",
  300: "#93BD95",
  400: "#6FA772",
  500: "#2C4A38",
  600: "#233D2D",
  700: "#1A2F22",
  800: "#122117",
  900: "#0A140D",
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
  // Surfaces — warm off-white (bone), never pure white, so white cards read as elevated
  cloud: "#FAF9F4",
  cloudLight: "#FCFBF7",
  surface: "#FFFFFF",
  surfaceMuted: gray[100],

  // Navy (dark ground)
  navy: "#0A1628",
  navyMid: "#132038",
  navyLight: "#1C2D4A",

  // Primary — deep forest green (AI Wellness wordmark)
  teal: teal[500],
  tealDark: teal[700],
  tealTint: teal[50],

  // Accent — peach (AI Wellness logo mark / "Embracing Longevity" lockup)
  amber: "#E98A6D",
  amberLight: "#F0AC93",
  amberLighter: "#FBE4DA",
  amberDark: "#B85F44",

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

  // Glass surfaces (used with BlurView)
  glassLight: "rgba(255,255,255,0.55)",
  glassLightBorder: "rgba(255,255,255,0.7)",
  glassDark: "rgba(255,255,255,0.06)",
  glassDarkBorder: "rgba(255,255,255,0.14)",

  // ─── Brand aliases (CLAUDE.md names — sage/bone/terracotta/charcoal) ───
  bone: "#FAF9F4",
  sage: teal[500],
  sageDark: teal[700],
  sageTint: teal[50],
  charcoal: gray[900],
  terracotta: "#E98A6D",
  terracottaInk: "#B85F44",
  terracottaTint: "#FBE4DA",
} as const;

// ─── Typography ───

export const fontFamilies = {
  display: "Manrope_600SemiBold",
  displayMedium: "Manrope_600SemiBold",
  displaySemiBold: "Manrope_700Bold",
  displayBold: "Manrope_800ExtraBold",
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
  "2xl": 28,
  "3xl": 36,
  full: 9999,
} as const;

// ─── Gradient orbs (soft radial glow accents) ───

export const gradientOrbs = {
  teal: ["rgba(111,167,114,0.45)", "rgba(111,167,114,0)"] as [string, string],
  amber: ["rgba(233,138,109,0.5)", "rgba(233,138,109,0)"] as [string, string],
  navy: ["rgba(19,32,56,0.6)", "rgba(19,32,56,0)"] as [string, string],
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
