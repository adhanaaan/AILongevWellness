import { Platform } from "react-native";

// Expo's `output: "single"` build does NOT apply app/+html.tsx — the generated
// index.html ships with `#root { height: 100% }` (which on iOS Safari is the
// LARGE viewport, including the bottom-toolbar area) and a viewport meta WITHOUT
// `viewport-fit=cover`. Consequences: the app extends under Safari's chrome (so
// bottom content / the tab bar clip), and `env(safe-area-inset-*)` reads 0 (so
// react-native-safe-area-context reports 0 insets on web).
//
// The only reliable seam for a single-output build is to patch both at runtime,
// from the app JS, on the web. Idempotent; safe to call at module load.
export function applyWebViewportFix() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  // viewport-fit=cover so iOS Safari populates env(safe-area-inset-*).
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) {
    vp.setAttribute(
      "content",
      "width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
    );
  }

  // Make the app exactly the DYNAMIC viewport tall so its bottom edge stays above
  // Safari's toolbar (100dvh), overriding the reset's #root{height:100%}. The
  // 100vh line is a fallback for browsers without dvh support.
  const root = document.getElementById("root");
  if (root) {
    root.style.height = "100vh";
    root.style.height = "100dvh";
  }
}
