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

  const root = document.getElementById("root");
  if (!root) return;

  // Inside the native shell, stop here. Everything below fights mobile Safari's
  // floating bottom toolbar, which does not exist in a WKWebView -- and the
  // visualViewport listeners would still fire on keyboard open, resizing #root
  // underneath the shell's own keyboard handling and causing layout jitter.
  // The shell also insets the WebView itself, so the app is already the right
  // size. Checked directly rather than via lib/platform because this runs at
  // module load, before initPlatform() has resolved; the flag is injected by
  // the shell before any page script, so it is reliable this early.
  if ((window as { __AIW_NATIVE_HOST__?: boolean }).__AIW_NATIVE_HOST__) {
    root.style.height = "100%";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    return;
  }

  // Size the app to the VISUAL viewport. iOS Safari's floating bottom URL bar
  // overlays content and is NOT excluded by 100dvh or env(safe-area-inset), which
  // is why the tab bar kept clipping. window.visualViewport.height IS the real
  // visible area (it shrinks for the floating bar, and for the keyboard), so
  // fitting #root to it keeps the bottom tab bar above the bar. Re-fit whenever
  // the bar shows/hides (resize) or the page scrolls it away (scroll). Falls back
  // to 100dvh where visualViewport isn't available.
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (vv) {
    const fit = () => {
      root.style.height = `${Math.round(vv.height)}px`;
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    // iOS Safari's bottom bar settles AFTER load (splash → first paint → bar
    // collapses to the floating pill), and that transition doesn't always fire a
    // visualViewport 'resize'. Without these catch-up re-fits the app can stay
    // sized to the taller full-bar state, leaving a dead band below the tab bar.
    if (typeof window !== "undefined") {
      window.addEventListener("resize", fit);
      window.addEventListener("orientationchange", fit);
      window.addEventListener("pageshow", fit);
    }
    [150, 400, 800, 1500].forEach((ms) => setTimeout(fit, ms));
  } else {
    root.style.height = "100vh";
    root.style.height = "100dvh";
  }
}
