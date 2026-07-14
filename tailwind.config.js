/**
 * AI Wellness — locked design tokens.
 * This is the single source of truth for colour, type, radius and spacing.
 * The Stitch exports drifted (primary #3f6355, bg #f9f9f9); those are WRONG.
 * The real brand values below are authoritative — do not reintroduce Stitch's values.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Brand core ---
        bone: "#FAF9F4",          // app background / canvas
        surface: "#FFFFFF",       // cards, sheets
        "surface-muted": "#F3F1EA", // low surface: input bg, subtle fills, table header
        charcoal: "#1A1C1C",      // primary text
        "ink-muted": "#5F625C",   // secondary text, captions

        // --- Sage (primary) ---
        sage: "#6B9080",
        "sage-dark": "#557567",   // hover / active / primary-container
        "sage-tint": "#E8F0EB",   // chip bg, sage badge bg, sage-fixed surfaces

        // --- Terracotta (accent — use sparingly: "monitor" / out-of-range) ---
        terracotta: "#E98A6D",
        "terracotta-ink": "#B8542F", // text on terracotta tint
        "terracotta-tint": "#FBE9E1",

        // --- Lines ---
        border: "#DCD9CF",        // card borders, dividers (outline-variant)
        "border-strong": "#C9C5B8", // input borders (outline)

        // --- True error (needs-attention only; NOT for "monitor") ---
        danger: "#BA1A1A",
        "danger-tint": "#FBE4E2",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "8px",   // inner elements, small chips
        md: "12px",  // inputs, admin buttons, inner cards
        lg: "16px",  // primary cards
        full: "9999px", // pills, primary CTAs, avatars
      },
      boxShadow: {
        soft: "0 4px 20px rgba(26, 28, 28, 0.08)",
        card: "0 1px 3px rgba(26, 28, 28, 0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
